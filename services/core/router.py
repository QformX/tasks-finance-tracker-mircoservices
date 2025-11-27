from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import jwt
import os
import json
import redis.asyncio as redis
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid

from services.core.database import get_master_session, get_replica_session
from services.core.models import Task
from services.core.events import mq_client

router = APIRouter()

# Config
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Redis Client
# Note: In a real app, manage this connection lifespan in main.py lifespan
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Auth Dependency
async def get_current_user_id(authorization: str = Header(...)) -> uuid.UUID:
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
             raise HTTPException(status_code=401, detail="Invalid token payload")
        return uuid.UUID(user_id)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Pydantic Models
class TaskCreate(BaseModel):
    title: str
    category_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None

class TaskRead(BaseModel):
    id: uuid.UUID
    title: str
    is_completed: bool
    created_at: datetime
    due_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

@router.post("/tasks", response_model=TaskRead)
async def create_task(
    task_in: TaskCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_master_session)
):
    # 1. DB Write (Master)
    new_task = Task(
        user_id=user_id,
        title=task_in.title,
        category_id=task_in.category_id,
        due_date=task_in.due_date
    )
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)

    # 2. RabbitMQ Publish
    event = {
        "event_type": "TaskCreated",
        "task_id": str(new_task.id),
        "user_id": str(user_id),
        "title": new_task.title,
        "created_at": new_task.created_at.isoformat()
    }
    await mq_client.publish(routing_key="core.task.created", message=event)

    # 3. Redis Operations
    # Invalidate cache list
    await redis_client.delete(f"tasks:{user_id}")
    
    # Add to Sorted Set if due_date (for timers/notifications)
    if new_task.due_date:
        timestamp = new_task.due_date.timestamp()
        await redis_client.zadd("tasks:deadlines", {str(new_task.id): timestamp})

    return new_task

@router.get("/tasks", response_model=List[TaskRead])
async def get_tasks(
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_replica_session)
):
    # 1. Check Redis Cache
    cache_key = f"tasks:{user_id}"
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception:
        # Fallback if Redis fails
        pass

    # 2. DB Read (Replica)
    stmt = select(Task).where(Task.user_id == user_id)
    result = await session.execute(stmt)
    tasks = result.scalars().all()

    # 3. Set Cache
    try:
        tasks_data = [
            {
                "id": str(t.id), 
                "title": t.title, 
                "is_completed": t.is_completed, 
                "created_at": t.created_at.isoformat(),
                "due_date": t.due_date.isoformat() if t.due_date else None
            } 
            for t in tasks
        ]
        await redis_client.set(cache_key, json.dumps(tasks_data), ex=60)
    except Exception:
        pass

    return tasks

