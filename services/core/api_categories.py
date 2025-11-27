from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
import json
import redis.asyncio as redis
import os
from datetime import datetime

from services.core.database import get_db_master, get_db_replica
from services.core.models import Category
from services.core.schemas import CategoryCreate, CategoryResponse, CategoryType
from services.core.events import mq_client
from services.core.auth import get_current_user_id

router = APIRouter(prefix="/categories", tags=["categories"])

# Redis client
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    type: Optional[CategoryType] = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_replica)  # READ from REPLICA
):
    """
    Получение списка категорий пользователя
    - CQRS: READ from Replica DB
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
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """
    Создание новой категории
    - CQRS: WRITE to Master DB
    - Инвалидация кэша
    - Отправка события в RabbitMQ
    """
    # Create category in Master DB
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
    
    # TODO: Send to RabbitMQ (background task)
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

