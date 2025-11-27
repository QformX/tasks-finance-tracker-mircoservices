from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid

# ===== Enums =====
class CategoryType(str, Enum):
    tasks = "tasks"
    purchases = "purchases"
    mixed = "mixed"

class FilterType(str, Enum):
    today = "today"
    overdue = "overdue"
    inbox = "inbox"

# ===== Category Schemas =====
class CategoryCreate(BaseModel):
    title: str
    type: CategoryType = CategoryType.mixed
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    type: str
    
    model_config = ConfigDict(from_attributes=True)

# ===== Task Schemas =====
class TaskCreate(BaseModel):
    title: str
    category_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None

class TaskResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    title: str
    is_completed: bool
    due_date: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ===== Purchase Schemas =====
class PurchaseCreate(BaseModel):
    title: str
    category_id: Optional[uuid.UUID] = None
    cost: Optional[float] = None
    quantity: int = 1
    unit: Optional[str] = "шт"

class PurchaseUpdate(BaseModel):
    title: Optional[str] = None
    is_bought: Optional[bool] = None
    cost: Optional[float] = None
    quantity: Optional[int] = None

class PurchaseResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    title: str
    is_bought: bool
    cost: Optional[float]
    quantity: int
    
    model_config = ConfigDict(from_attributes=True)

# ===== Smart View Schemas =====
class SmartViewCreate(BaseModel):
    title: str
    rules: Dict[str, Any]  # JSON правила фильтрации

class SmartViewResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    rules: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)

