from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
import uuid
from typing import Optional
from datetime import datetime
from app.models import Category, Task, Purchase
from app.schemas import CategoryCreate
from app.core.events import mq_client

class CategoryService:
    @staticmethod
    async def create(session: AsyncSession, user_id: uuid.UUID, category_in: CategoryCreate) -> Category:
        new_category = Category(
            user_id=user_id,
            title=category_in.title,
            type=category_in.type.value
        )
        
        session.add(new_category)
        await session.commit()
        await session.refresh(new_category)
        
        # Publish event
        try:
            event = {
                "event_type": "CategoryCreated",
                "category_id": str(new_category.id),
                "user_id": str(user_id),
                "title": new_category.title,
                "type": new_category.type,
                "created_at": datetime.utcnow().isoformat()
            }
            await mq_client.publish(routing_key="core.category.created", message=event)
        except Exception as e:
            print(f"Failed to publish event: {e}")
            
        return new_category

    @staticmethod
    async def delete(
        session: AsyncSession, 
        user_id: uuid.UUID, 
        category_id: uuid.UUID, 
        strategy: str = "delete_all", 
        target_category_id: Optional[uuid.UUID] = None
    ) -> bool:
        # 1. Check if category exists and belongs to user
        category = await session.get(Category, category_id)
        if not category or category.user_id != user_id:
            return False

        # 2. Handle strategies
        if strategy == "move_to_category":
            if not target_category_id:
                raise ValueError("target_category_id is required for move strategy")
            
            # Check target category
            target_category = await session.get(Category, target_category_id)
            if not target_category or target_category.user_id != user_id:
                raise ValueError("Target category not found")
                
            # Move tasks
            await session.execute(
                update(Task)
                .where(Task.category_id == category_id)
                .values(category_id=target_category_id)
            )
            
            # Move purchases
            await session.execute(
                update(Purchase)
                .where(Purchase.category_id == category_id)
                .values(category_id=target_category_id)
            )
            
        elif strategy == "delete_all":
            # Delete tasks
            await session.execute(
                delete(Task).where(Task.category_id == category_id)
            )
            # Delete purchases
            await session.execute(
                delete(Purchase).where(Purchase.category_id == category_id)
            )
        else:
            raise ValueError("Invalid strategy")

        # 3. Delete category
        await session.delete(category)
        await session.commit()
        
        # Publish event
        try:
            event = {
                "event_type": "CategoryDeleted",
                "category_id": str(category_id),
                "user_id": str(user_id),
                "deleted_at": datetime.utcnow().isoformat()
            }
            await mq_client.publish(routing_key="core.category.deleted", message=event)
        except Exception as e:
            print(f"Failed to publish event: {e}")
            
        return True

