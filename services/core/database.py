import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Environment variables
DATABASE_MASTER_URL = os.getenv("DATABASE_MASTER_URL", "postgresql+asyncpg://user:password@localhost/core_db")
DATABASE_REPLICA_URL = os.getenv("DATABASE_REPLICA_URL", "postgresql+asyncpg://user:password@localhost/core_db")

# Engines
master_engine = create_async_engine(DATABASE_MASTER_URL, echo=True)
replica_engine = create_async_engine(DATABASE_REPLICA_URL, echo=True)

# Session Factories
MasterSessionLocal = async_sessionmaker(bind=master_engine, expire_on_commit=False, class_=AsyncSession)
ReplicaSessionLocal = async_sessionmaker(bind=replica_engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

# ===== CQRS Dependencies =====

# Dependency for WRITES (POST/PUT/DELETE)
async def get_db_master() -> AsyncSession:
    """
    Dependency для операций ЗАПИСИ
    Используется в POST/PUT/DELETE эндпоинтах
    """
    async with MasterSessionLocal() as session:
        yield session

# Dependency for READS (GET)
async def get_db_replica() -> AsyncSession:
    """
    Dependency для операций ЧТЕНИЯ
    Используется в GET эндпоинтах
    """
    async with ReplicaSessionLocal() as session:
        yield session

async def init_db():
    # In a real app with migrations (Alembic), this isn't needed in main code.
    # For this demo, we create tables on the Master.
    async with master_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
