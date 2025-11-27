from contextlib import asynccontextmanager
from fastapi import FastAPI
from services.users.router import router
from services.users.events import mq_client
from services.users.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Users Service...")
    await mq_client.connect()
    # Tables are managed by Alembic migrations
    # await init_db()
    yield
    print("Shutting down Users Service...")
    await mq_client.close()

app = FastAPI(
    title="Users Service", 
    lifespan=lifespan,
    root_path="/auth",
    docs_url="/docs",
    openapi_url="/openapi.json",
    description="Сервис аутентификации и управления пользователями"
)

app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "users"}
