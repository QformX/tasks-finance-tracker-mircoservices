from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
import uuid
from typing import Optional


class UserCreate(BaseModel):
    """Схема для регистрации пользователя"""
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """Схема для входа пользователя"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Схема ответа с данными пользователя"""
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Схема токенов"""
    access_token: str
    token_type: str = "bearer"
    refresh_token: str


class UserSessionResponse(BaseModel):
    """Схема ответа с данными сессии"""
    id: uuid.UUID
    user_agent: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)
