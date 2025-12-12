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
from app.services.categories import CategoryService

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
    return await CategoryService.create(session, user_id, category_in)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    strategy: str = Query("delete_all", description="Strategy: 'delete_all' or 'move_to_category'"),
    target_category_id: Optional[uuid.UUID] = Query(None, description="Target category ID if strategy is 'move_to_category'"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Удаление категории
    - strategy='delete_all': Удаляет категорию и все связанные задачи/покупки
    - strategy='move_to_category': Перемещает задачи/покупки в другую категорию, затем удаляет текущую
    """
    try:
        deleted = await CategoryService.delete(session, user_id, category_id, strategy, target_category_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Category not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

