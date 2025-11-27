import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/core_db")

# Engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Session Factory
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

# ===== Database Dependency =====

async def get_db_session() -> AsyncSession:
    """
    Dependency для получения сессии БД
    Используется во всех эндпоинтах
    """
    async with SessionLocal() as session:
        yield session

# Alias для совместимости (можно удалить после рефакторинга)
get_db_master = get_db_session
get_db_replica = get_db_session

async def init_db():
    # In a real app with migrations (Alembic), this isn't needed in main code.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
