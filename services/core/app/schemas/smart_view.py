from pydantic import BaseModel, ConfigDict
from typing import Dict, Any
import uuid


class SmartViewCreate(BaseModel):
    """Схема для создания умного представления"""
    title: str
    rules: Dict[str, Any]  # JSON правила фильтрации


class SmartViewResponse(BaseModel):
    """Схема ответа с данными умного представления"""
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    rules: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)
