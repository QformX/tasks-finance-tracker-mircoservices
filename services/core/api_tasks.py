from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
import uuid
import json
import redis.asyncio as redis
import os
import hashlib
from datetime import datetime, date

from services.core.database import get_db_master, get_db_replica
from services.core.models import Task
from services.core.schemas import TaskCreate, TaskUpdate, TaskResponse, FilterType
from services.core.events import mq_client
from services.core.auth import get_current_user_id

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Redis client
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

def _generate_cache_key(user_id: uuid.UUID, **params) -> str:
    """Генерация ключа кэша на основе параметров"""
    params_str = json.dumps(params, sort_keys=True, default=str)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()
    return f"user:{user_id}:tasks:{params_hash}"

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    category_id: Optional[uuid.UUID] = Query(None, description="Фильтр по категории"),
    filter: Optional[FilterType] = Query(None, description="Быстрый фильтр: today/overdue/inbox"),
    is_completed: bool = Query(False, description="Показать завершённые задачи"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_replica)  # READ from REPLICA
):
    """
    Получение списка задач с фильтрацией
    - CQRS: READ from Replica DB
    - Кэширование в Redis (TTL 60s)
    - Поддержка быстрых фильтров (today, overdue, inbox)
    """
    # Generate cache key
    cache_params = {
        "category_id": str(category_id) if category_id else None,
        "filter": filter.value if filter else None,
        "is_completed": is_completed
    }
    cache_key = _generate_cache_key(user_id, **cache_params)
    
    # 1. Check Redis cache
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            print(f"Cache HIT for {cache_key}")
            tasks_data = json.loads(cached_data)
            return [TaskResponse(**task) for task in tasks_data]
    except Exception as e:
        print(f"Redis error: {e}")
    
    # 2. Query from Replica DB
    stmt = select(Task).where(Task.user_id == user_id, Task.is_completed == is_completed)
    
    # Apply category filter
    if category_id:
        stmt = stmt.where(Task.category_id == category_id)
    
    # Apply quick filters
    if filter == FilterType.today:
        today = date.today()
        stmt = stmt.where(Task.due_date >= datetime.combine(today, datetime.min.time()))
        stmt = stmt.where(Task.due_date < datetime.combine(today, datetime.max.time()))
    elif filter == FilterType.overdue:
        stmt = stmt.where(Task.due_date < datetime.now())
        stmt = stmt.where(Task.is_completed == False)
    elif filter == FilterType.inbox:
        stmt = stmt.where(Task.category_id.is_(None))
    
    stmt = stmt.order_by(Task.created_at.desc())
    
    result = await session.execute(stmt)
    tasks = result.scalars().all()
    
    # 3. Save to Redis cache (TTL 60s)
    try:
        tasks_data = [
            {
                "id": str(t.id),
                "user_id": str(t.user_id),
                "category_id": str(t.category_id) if t.category_id else None,
                "title": t.title,
                "is_completed": t.is_completed,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "created_at": t.created_at.isoformat()
            }
            for t in tasks
        ]
        await redis_client.setex(cache_key, 60, json.dumps(tasks_data))
        print(f"Cache SET for {cache_key}")
    except Exception as e:
        print(f"Failed to cache: {e}")
    
    return tasks

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """
    Создание новой задачи
    - CQRS: WRITE to Master DB
    - Добавление напоминания в Redis Sorted Set (если есть due_date)
    - Инвалидация кэша списков
    - Отправка события TaskCreated в RabbitMQ
    """
    # 1. Insert to Master DB
    new_task = Task(
        user_id=user_id,
        title=task_in.title,
        category_id=task_in.category_id,
        due_date=task_in.due_date,
        is_completed=False
    )
    
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)
    
    # 2. Add to Redis Sorted Set for reminders (if due_date exists)
    if new_task.due_date:
        try:
            timestamp = new_task.due_date.timestamp()
            await redis_client.zadd("tasks:deadlines", {str(new_task.id): timestamp})
            print(f"Added task {new_task.id} to reminders with timestamp {timestamp}")
        except Exception as e:
            print(f"Failed to add reminder: {e}")
    
    # 3. Invalidate cache (delete all task lists for this user)
    try:
        # Используем pattern matching для удаления всех кэшей задач пользователя
        pattern = f"user:{user_id}:tasks:*"
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
        print(f"Invalidated cache for pattern: {pattern}")
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    # 4. TODO: Send to RabbitMQ
    async def send_event():
        try:
            event = {
                "event_type": "TaskCreated",
                "task_id": str(new_task.id),
                "user_id": str(user_id),
                "title": new_task.title,
                "category_id": str(new_task.category_id) if new_task.category_id else None,
                "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
                "created_at": new_task.created_at.isoformat()
            }
            await mq_client.publish(routing_key="core.task.created", message=event)
        except Exception as e:
            print(f"Failed to publish event: {e}")
    
    background_tasks.add_task(send_event)
    
    return new_task

@router.post("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """
    Переключение статуса задачи (completed/uncompleted)
    - CQRS: WRITE to Master DB
    - Инвалидация кэша
    - Отправка события TaskCompleted (если задача была завершена)
    """
    # 1. Get task
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # 2. Toggle is_completed
    was_completed_before = task.is_completed
    task.is_completed = not task.is_completed
    
    await session.commit()
    await session.refresh(task)
    
    # 3. Invalidate cache
    try:
        pattern = f"user:{user_id}:tasks:*"
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    # 4. Send to RabbitMQ (if task was completed)
    if not was_completed_before and task.is_completed:
        async def send_event():
            try:
                event = {
                    "event_type": "TaskCompleted",
                    "task_id": str(task.id),
                    "user_id": str(user_id),
                    "title": task.title,
                    "completed_at": datetime.utcnow().isoformat()
                }
                await mq_client.publish(routing_key="core.task.completed", message=event)
            except Exception as e:
                print(f"Failed to publish event: {e}")
        
        background_tasks.add_task(send_event)
    
    return task

@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """
    Обновление задачи (частичное или полное)
    - CQRS: WRITE to Master DB
    - Инвалидация кэша
    - Отправка события TaskCompleted (если is_completed изменилось на True)
    """
    # 1. Get task
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # 2. Update fields
    update_data = task_update.model_dump(exclude_unset=True)
    was_completed_now = False
    
    if update_data:
        for field, value in update_data.items():
            if field == "is_completed" and value is True and not task.is_completed:
                was_completed_now = True
            setattr(task, field, value)
        
        await session.commit()
        await session.refresh(task)
    
    # 3. Invalidate cache
    try:
        pattern = f"user:{user_id}:tasks:*"
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    # 4. Send to RabbitMQ (if task was completed)
    if was_completed_now:
        async def send_event():
            try:
                event = {
                    "event_type": "TaskCompleted",
                    "task_id": str(task.id),
                    "user_id": str(user_id),
                    "title": task.title,
                    "completed_at": datetime.utcnow().isoformat()
                }
                await mq_client.publish(routing_key="core.task.completed", message=event)
            except Exception as e:
                print(f"Failed to publish event: {e}")
        
        background_tasks.add_task(send_event)
    
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """Удаление задачи"""
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    await session.delete(task)
    await session.commit()
    
    # Invalidate cache
    try:
        pattern = f"user:{user_id}:tasks:*"
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    return None

