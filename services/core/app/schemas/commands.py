from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

class CreateTaskCMD(BaseModel):
    user_id: UUID
    title: str
    category_id: Optional[UUID] = None
    due_date: Optional[datetime] = None

class CreatePurchaseCMD(BaseModel):
    user_id: UUID
    title: str
    category_id: Optional[UUID] = None
    cost: Optional[float] = None
    quantity: int = 1

class DeleteItemCMD(BaseModel):
    user_id: UUID
    item_id: UUID
    item_type: Literal["task", "purchase"]
