from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta, timezone
import uuid
import jwt
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_session
from app.core.config import settings
from app.models import User, UserSession
from app.core.auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    create_refresh_token
)
from app.schemas import UserCreate, UserLogin, UserResponse, Token, UserSessionResponse
from app.core.events import mq_client

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()
security = HTTPBearer()


# ===== Dependencies =====
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    session: AsyncSession = Depends(get_session)
) -> User:
    """Dependency для получения текущего пользователя из Bearer Token"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
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
@limiter.limit("5/hour")
async def register(request: Request, user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    """
    Регистрация нового пользователя
    - Принимает: username, email, password
    - Проверка уникальности email и username
    - Хэширование пароля
    - Создание записи в БД
    """
    stmt = select(User).where(User.email == user_in.email)
    result = await session.execute(stmt)
    if result.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    stmt = select(User).where(User.username == user_in.username)
    result = await session.execute(stmt)
    if result.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
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
@limiter.limit("10/minute")
async def login(
    request: Request,
    credentials: UserLogin, 
    session: AsyncSession = Depends(get_session)
):
    """
    Аутентификация пользователя
    - Принимает в теле запроса: email и password
    - Проверка email/password
    - Генерация JWT Access Token и Refresh Token
    - Создание сессии
    """
    stmt = select(User).where(User.email == credentials.email)
    result = await session.execute(stmt)
    user = result.scalar()
    
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

    refresh_token = create_refresh_token()
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    
    new_session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    session.add(new_session)
    await session.commit()
    await session.refresh(new_session)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "sid": str(new_session.id)}, 
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token, 
        token_type="bearer",
        refresh_token=refresh_token
    )


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
    stmt = update(User).where(User.id == current_user.id).values(is_active=False)
    await session.execute(stmt)
    await session.commit()
    
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


@router.post("/refresh", response_model=Token)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    refresh_token: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Обновление Access Token с помощью Refresh Token
    - Проверка валидности Refresh Token
    - Проверка срока действия
    - Выдача новой пары токенов (Refresh Token Rotation)
    """
    stmt = select(UserSession).where(
        UserSession.refresh_token == refresh_token,
        UserSession.is_revoked == False,
        UserSession.expires_at > datetime.now(timezone.utc)
    )
    result = await session.execute(stmt)
    user_session = result.scalar()

    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user = await session.get(User, user_session.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    user_session.is_revoked = True
    
    new_refresh_token = create_refresh_token()
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    new_session = UserSession(
        user_id=user.id,
        refresh_token=new_refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    session.add(new_session)
    await session.commit()
    await session.refresh(new_session)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "sid": str(new_session.id)}, 
        expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        refresh_token=new_refresh_token
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    refresh_token: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Выход из системы (отзыв Refresh Token)
    """
    stmt = select(UserSession).where(UserSession.refresh_token == refresh_token)
    result = await session.execute(stmt)
    user_session = result.scalar()

    if user_session:
        user_session.is_revoked = True
        await session.commit()
    
    return None


@router.get("/sessions", response_model=List[UserSessionResponse])
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Получение списка активных сессий пользователя
    """

    token = credentials.credentials
    current_session_id = None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        current_session_id = payload.get("sid")
    except:
        pass

    stmt = select(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False,
        UserSession.expires_at > datetime.now(timezone.utc)
    ).order_by(UserSession.created_at.desc())
    
    result = await session.execute(stmt)
    sessions = result.scalars().all()
    
    response = []
    for s in sessions:
        s_resp = UserSessionResponse.model_validate(s)
        if current_session_id and str(s.id) == current_session_id:
            s_resp.is_current = True
        response.append(s_resp)
    
    return response


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Принудительное завершение сессии (отзыв токена)
    """
    stmt = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    )
    result = await session.execute(stmt)
    user_session = result.scalar()

    if not user_session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_session.is_revoked = True
    await session.commit()
    
    return None


@router.post("/sessions/revoke-all-except-current", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_all_sessions_except_current(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Отзыв всех сессий пользователя, кроме текущей
    - Получает текущую сессию из JWT токена
    - Отзывает все остальные активные сессии
    - Полезно при подозрении на компрометацию аккаунта
    """
    token = credentials.credentials
    current_session_id = None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        current_session_id = payload.get("sid")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not current_session_id:
        raise HTTPException(status_code=401, detail="Session ID not found in token")

    # Revoke all sessions except current
    stmt = update(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.id != uuid.UUID(current_session_id),
        UserSession.is_revoked == False
    ).values(is_revoked=True)
    
    result = await session.execute(stmt)
    await session.commit()
    
    revoked_count = result.rowcount
    print(f"Revoked {revoked_count} sessions for user {current_user.id}")
    
    return None
