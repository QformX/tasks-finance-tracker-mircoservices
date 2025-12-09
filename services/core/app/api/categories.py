from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
import redis.asyncio as redis
from datetime import datetime

from app.core.database import get_session
from app.core.config import settings
from app.models import Category
from app.schemas import CategoryCreate, CategoryResponse, CategoryType
from app.core.events import mq_client
from app.core.auth import get_current_user_id

router = APIRouter(prefix="/categories", tags=["categories"])

# Redis client
redis_client = redis.from_url(settings.redis_url, decode_responses=True)

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
    # Create category
    new_category = Category(
        user_id=user_id,
        title=category_in.title,
        type=category_in.type.value
    )
    
    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)
    
    # Invalidate cache
    try:
        await redis_client.delete(f"user:{user_id}:categories")
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    # Send event to RabbitMQ
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
