from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
import uuid


class TaskCreate(BaseModel):
    """Схема для создания задачи"""
    title: str
    category_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None


class TaskUpdate(BaseModel):
    """Схема для обновления задачи"""
    title: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    is_completed: Optional[bool] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None


class TaskResponse(BaseModel):
    """Схема ответа с данными задачи"""
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    title: str
    description: Optional[str] = None
    is_completed: bool
    due_date: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
