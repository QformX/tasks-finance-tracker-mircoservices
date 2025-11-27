from contextlib import asynccontextmanager
from fastapi import FastAPI
from services.core.events import mq_client
from services.core.database import init_db

# Import all routers
from services.core.api_categories import router as categories_router
from services.core.api_tasks import router as tasks_router
from services.core.api_purchases import router as purchases_router
from services.core.api_smart_views import router as smart_views_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Core Service...")
    await mq_client.connect()
    # Tables are managed by Alembic migrations
    # await init_db()  # Comment out - use Alembic instead
    yield
    # Shutdown
    print("Shutting down Core Service...")
    await mq_client.close()

app = FastAPI(
    title="Core Service", 
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs",
    openapi_url="/openapi.json",
    description="Микросервис для управления задачами и покупками с CQRS и событийной архитектурой"
)

# Include all routers
app.include_router(categories_router)
app.include_router(tasks_router)
app.include_router(purchases_router)
app.include_router(smart_views_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "core"}
