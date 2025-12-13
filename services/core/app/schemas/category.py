from pydantic import BaseModel, ConfigDict
from typing import Optional
from enum import Enum
import uuid


class CategoryType(str, Enum):
    """Тип категории"""
    tasks = "tasks"
    purchases = "purchases"
    mixed = "mixed"


class CategoryCreate(BaseModel):
    """Схема для создания категории"""
    title: str
    type: CategoryType = CategoryType.mixed
    color: Optional[str] = None
    icon: Optional[str] = None


class CategoryUpdate(BaseModel):
    """Схема для обновления категории"""
    title: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class CategoryResponse(BaseModel):
    """Схема ответа с данными категории"""
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    type: str
    color: Optional[str] = None
    icon: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
