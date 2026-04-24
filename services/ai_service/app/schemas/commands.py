from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

class CreateTaskCMD(BaseModel):
    user_id: UUID
    title: str
    category_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None

class UpdateTaskCMD(BaseModel):
    user_id: UUID
    task_id: UUID
    title: Optional[str] = None
    category_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    description: Optional[str] = None

class CreatePurchaseCMD(BaseModel):
    user_id: UUID
    title: str
    category_id: Optional[UUID] = None
    cost: Optional[float] = None
    quantity: int = 1

class CreateCategoryCMD(BaseModel):
    user_id: UUID
    title: str
    type: Literal["tasks", "purchases", "mixed"]

class DeleteItemCMD(BaseModel):
    user_id: UUID
    item_id: UUID
    item_type: Literal["task", "purchase", "category"]
