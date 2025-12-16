import uuid
import asyncio
import json
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Task
from app.schemas import TaskCreate
from app.core.events import mq_client
from app.core.config import settings

redis_client = redis.from_url(settings.redis_url, decode_responses=True)

class TaskService:
    @staticmethod
    async def create(session: AsyncSession, user_id: uuid.UUID, task_in: TaskCreate) -> Task:
        new_task = Task(
            user_id=user_id,
            title=task_in.title,
            description=task_in.description,
            category_id=task_in.category_id,
            due_date=task_in.due_date,
            is_completed=False
        )
        
        session.add(new_task)
        await session.commit()
        await session.refresh(new_task)
        
        async def side_effects():
            # 1. Add reminder
            try:
                if new_task.due_date:
                    timestamp = int(new_task.due_date.timestamp())
                    await redis_client.zadd(
                        f"reminders:{user_id}",
                        {str(new_task.id): timestamp}
                    )
            except Exception as e:
                print(f"Failed to add reminder: {e}")

            # 2. Invalidate cache
            try:
                pattern = f"user:{user_id}:tasks:*"
                async for key in redis_client.scan_iter(match=pattern):
                    await redis_client.delete(key)
            except Exception as e:
                print(f"Failed to invalidate cache: {e}")

            # 3. Send event
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

        # Run side effects in background (fire and forget)
        asyncio.create_task(side_effects())
        
        return new_task

    @staticmethod
    async def delete(session: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID):
        task = await session.get(Task, task_id)
        if task and task.user_id == user_id:
            await session.delete(task)
            await session.commit()
            
            async def side_effects():
                try:
                    pattern = f"user:{user_id}:tasks:*"
                    async for key in redis_client.scan_iter(match=pattern):
                        await redis_client.delete(key)
                except Exception as e:
                    print(f"Failed to invalidate cache: {e}")
            
            asyncio.create_task(side_effects())
            return True
        return False
