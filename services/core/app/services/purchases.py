import uuid
import asyncio
import json
import redis.asyncio as redis
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Purchase
from app.schemas import PurchaseCreate, PurchaseUpdate
from app.core.events import mq_client
from app.core.config import settings

redis_client = redis.from_url(settings.redis_url, decode_responses=True)

class PurchaseService:
    @staticmethod
    async def create(session: AsyncSession, user_id: uuid.UUID, purchase_in: PurchaseCreate) -> Purchase:
        new_purchase = Purchase(
            user_id=user_id,
            title=purchase_in.title,
            category_id=purchase_in.category_id,
            cost=purchase_in.cost,
            quantity=purchase_in.quantity,
            is_bought=False
        )
        
        session.add(new_purchase)
        await session.commit()
        await session.refresh(new_purchase)
        
        async def side_effects():
            # 1. Invalidate cache
            try:
                pattern = f"user:{user_id}:purchases:*"
                async for key in redis_client.scan_iter(match=pattern):
                    await redis_client.delete(key)
            except Exception as e:
                print(f"Failed to invalidate cache: {e}")

            # 2. Send event
            try:
                event = {
                    "event_type": "PurchaseCreated",
                    "purchase_id": str(new_purchase.id),
                    "user_id": str(user_id),
                    "title": new_purchase.title,
                    "cost": new_purchase.cost,
                    "quantity": new_purchase.quantity,
                    "created_at": datetime.utcnow().isoformat()
                }
                await mq_client.publish(routing_key="core.purchase.created", message=event)
            except Exception as e:
                print(f"Failed to publish event: {e}")

        # Run side effects in background (fire and forget)
        asyncio.create_task(side_effects())
        
        return new_purchase

    @staticmethod
    async def update(session: AsyncSession, user_id: uuid.UUID, purchase_id: uuid.UUID, purchase_update: PurchaseUpdate) -> Optional[Purchase]:
        purchase = await session.get(Purchase, purchase_id)
        if not purchase or purchase.user_id != user_id:
            return None
        
        update_data = purchase_update.model_dump(exclude_unset=True)
        was_bought_now = False
        
        if update_data:
            for field, value in update_data.items():
                if field == "is_bought" and value is True and not purchase.is_bought:
                    was_bought_now = True
                setattr(purchase, field, value)
            
            await session.commit()
            await session.refresh(purchase)
            
        async def side_effects():
            # Invalidate cache
            try:
                pattern = f"user:{user_id}:purchases:*"
                async for key in redis_client.scan_iter(match=pattern):
                    await redis_client.delete(key)
            except Exception as e:
                print(f"Failed to invalidate cache: {e}")
                
            if was_bought_now:
                try:
                    event = {
                        "event_type": "PurchaseCompleted",
                        "purchase_id": str(purchase.id),
                        "user_id": str(user_id),
                        "title": purchase.title,
                        "cost": purchase.cost,
                        "quantity": purchase.quantity,
                        "total_cost": (purchase.cost or 0) * purchase.quantity,
                        "completed_at": datetime.utcnow().isoformat()
                    }
                    await mq_client.publish(routing_key="core.purchase.completed", message=event)
                except Exception as e:
                    print(f"Failed to publish event: {e}")

        asyncio.create_task(side_effects())
        return purchase

    @staticmethod
    async def delete(session: AsyncSession, user_id: uuid.UUID, purchase_id: uuid.UUID):
        purchase = await session.get(Purchase, purchase_id)
        if purchase and purchase.user_id == user_id:
            await session.delete(purchase)
            await session.commit()
            
            async def side_effects():
                try:
                    pattern = f"user:{user_id}:purchases:*"
                    async for key in redis_client.scan_iter(match=pattern):
                        await redis_client.delete(key)
                except Exception as e:
                    print(f"Failed to invalidate cache: {e}")
            
            asyncio.create_task(side_effects())
            return True
        return False
