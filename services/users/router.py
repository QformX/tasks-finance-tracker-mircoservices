from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
import uuid

from services.users.database import get_session
from services.users.models import User
from services.users.auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from services.users.schemas import UserCreate, UserLogin, UserResponse, Token
from services.users.events import mq_client

router = APIRouter()
security = HTTPBearer()

# ===== Dependencies =====
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    session: AsyncSession = Depends(get_session)
) -> User:
    """Dependency для получения текущего пользователя из Bearer Token"""
    import jwt
    import os
    
    token = credentials.credentials
    
    try:
        JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
        JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID format")

    user = await session.get(User, user_uuid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    return user

# ===== Endpoints =====
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    """
    Регистрация нового пользователя
    - Принимает: username, email, password
    - Проверка уникальности email и username
    - Хэширование пароля
    - Создание записи в БД
    """
    # Check if email exists
    stmt = select(User).where(User.email == user_in.email)
    result = await session.execute(stmt)
    if result.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists
    stmt = select(User).where(User.username == user_in.username)
    result = await session.execute(stmt)
    if result.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        is_active=True
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin, 
    session: AsyncSession = Depends(get_session)
):
    """
    Аутентификация пользователя
    - Принимает в теле запроса: email и password
    - Проверка email/password
    - Генерация JWT Access Token
    """
    # Find user by email
    stmt = select(User).where(User.email == credentials.email)
    result = await session.execute(stmt)
    user = result.scalar()
    
    # Verify credentials
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, 
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")

@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Получение информации о текущем пользователе
    """
    return current_user

@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Soft-delete текущего пользователя
    - Установка статуса is_active=False
    - Отправка события UserDeleted в RabbitMQ
    """
    # Soft delete
    stmt = update(User).where(User.id == current_user.id).values(is_active=False)
    await session.execute(stmt)
    await session.commit()
    
    # TODO: Send to RabbitMQ
    try:
        event = {
            "event_type": "UserDeleted",
            "user_id": str(current_user.id),
            "email": current_user.email,
            "deleted_at": datetime.utcnow().isoformat()
        }
        await mq_client.publish(routing_key="users.deleted", message=event)
    except Exception as e:
        print(f"Failed to publish UserDeleted event: {e}")
    
    return None
