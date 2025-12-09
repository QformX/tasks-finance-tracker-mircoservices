from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from datetime import datetime

from app.core.database import get_session
from app.models import Purchase
from app.schemas import PurchaseCreate, PurchaseUpdate, PurchaseResponse
from app.core.events import mq_client
from app.core.auth import get_current_user_id

router = APIRouter(prefix="/purchases", tags=["purchases"])

@router.get("/", response_model=List[PurchaseResponse])
async def get_purchases(
    category_id: Optional[uuid.UUID] = Query(None, description="Фильтр по категории"),
    is_bought: bool = Query(False, description="Показать купленные покупки"),
    without_category: bool = Query(False, description="Показать только покупки БЕЗ категории"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение списка покупок с фильтрацией
    """
    stmt = select(Purchase).where(
        Purchase.user_id == user_id,
        Purchase.is_bought == is_bought
    )
    
    # Фильтр по категории
    if without_category:
        stmt = stmt.where(Purchase.category_id.is_(None))
    elif category_id:
        stmt = stmt.where(Purchase.category_id == category_id)
    
    stmt = stmt.order_by(Purchase.id.desc())
    
    result = await session.execute(stmt)
    purchases = result.scalars().all()
    
    return purchases

@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    purchase_in: PurchaseCreate,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Создание новой покупки
    - Отправка события PurchaseCreated
    """
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
    
    # Send to RabbitMQ in background
    async def send_event():
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
    
    background_tasks.add_task(send_event)
    
    return new_purchase

@router.post("/{purchase_id}/toggle", response_model=PurchaseResponse)
async def toggle_purchase(
    purchase_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Переключение статуса покупки (куплено/не куплено)
    - Отправка события PurchaseCompleted (если стало is_bought=True)
    """
    purchase = await session.get(Purchase, purchase_id)
    if not purchase or purchase.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    
    # Toggle status
    old_status = purchase.is_bought
    purchase.is_bought = not purchase.is_bought
    
    await session.commit()
    await session.refresh(purchase)
    
    # Send to RabbitMQ (if purchase was just bought)
    if not old_status and purchase.is_bought:
        async def send_event():
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
        
        background_tasks.add_task(send_event)
    
    return purchase

@router.patch("/{purchase_id}", response_model=PurchaseResponse)
async def update_purchase(
    purchase_id: uuid.UUID,
    purchase_update: PurchaseUpdate,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновление покупки (частичное или полное)
    - Отправка события PurchaseCompleted (если is_bought изменилось на True)
    """
    purchase = await session.get(Purchase, purchase_id)
    if not purchase or purchase.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    
    update_data = purchase_update.model_dump(exclude_unset=True)
    was_bought_now = False
    
    if update_data:
        for field, value in update_data.items():
            if field == "is_bought" and value is True and not purchase.is_bought:
                was_bought_now = True
            setattr(purchase, field, value)
        
        await session.commit()
        await session.refresh(purchase)
    
    # Send to RabbitMQ (if purchase was just bought)
    if was_bought_now:
        async def send_event():
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
        
        background_tasks.add_task(send_event)
    
    return purchase

@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase(
    purchase_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """Удаление покупки"""
    purchase = await session.get(Purchase, purchase_id)
    if not purchase or purchase.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    
    await session.delete(purchase)
    await session.commit()
    
    return None
