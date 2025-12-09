from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

DATABASE_URL = settings.database_url

engine = create_async_engine(DATABASE_URL, echo=True)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def get_session() -> AsyncSession:
    """
    Dependency для получения сессии БД
    Используется во всех эндпоинтах
    """
    async with SessionLocal() as session:
        yield session

# Alias для совместимости (можно удалить после полного рефакторинга)
get_db_session = get_session
get_db_master = get_session
get_db_replica = get_session

async def init_db():
    """
    Инициализация БД (для разработки)
    В продакшене используется Alembic для миграций
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
