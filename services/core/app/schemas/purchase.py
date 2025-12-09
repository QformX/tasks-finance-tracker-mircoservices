from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid


class PurchaseCreate(BaseModel):
    """Схема для создания покупки"""
    title: str
    category_id: Optional[uuid.UUID] = None
    cost: Optional[float] = None
    quantity: int = 1
    unit: Optional[str] = "шт"


class PurchaseUpdate(BaseModel):
    """Схема для обновления покупки"""
    title: Optional[str] = None
    is_bought: Optional[bool] = None
    cost: Optional[float] = None
    quantity: Optional[int] = None


class PurchaseResponse(BaseModel):
    """Схема ответа с данными покупки"""
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    title: str
    is_bought: bool
    cost: Optional[float]
    quantity: int
    
    model_config = ConfigDict(from_attributes=True)
