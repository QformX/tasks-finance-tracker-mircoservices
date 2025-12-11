from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from typing import List, Optional
import uuid
from datetime import datetime

from app.core.database import get_session
from app.models import Category, Task, Purchase
from app.schemas import CategoryCreate, CategoryResponse, CategoryType
from app.core.events import mq_client
from app.core.auth import get_current_user_id

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    type: Optional[CategoryType] = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение списка категорий пользователя
    - Фильтрация по типу (опционально)
    """
    stmt = select(Category).where(Category.user_id == user_id)
    
    if type:
        stmt = stmt.where(Category.type == type.value)
    
    result = await session.execute(stmt)
    categories = result.scalars().all()
    
    return categories

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Создание новой категории
    - Инвалидация кэша
    - Отправка события в RabbitMQ
    """

    new_category = Category(
        user_id=user_id,
        title=category_in.title,
        type=category_in.type.value
    )
    
    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)
    
    async def send_event():
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
    
    background_tasks.add_task(send_event)
    
    return new_category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    strategy: str = Query(..., description="Strategy: 'delete_all' or 'move_to_category'"),
    target_category_id: Optional[uuid.UUID] = Query(None, description="Target category ID if strategy is 'move_to_category'"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Удаление категории
    - strategy='delete_all': Удаляет категорию и все связанные задачи/покупки
    - strategy='move_to_category': Перемещает задачи/покупки в другую категорию, затем удаляет текущую
    """
    # 1. Check if category exists and belongs to user
    category = await session.get(Category, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    # 2. Handle strategies
    if strategy == "move_to_category":
        if not target_category_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_category_id is required for move strategy")
        
        # Check target category
        target_category = await session.get(Category, target_category_id)
        if not target_category or target_category.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target category not found")
            
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid strategy")

    # 3. Delete category
    await session.delete(category)
    await session.commit()

    # 4. Send event
    async def send_event():
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
    
    background_tasks.add_task(send_event)

