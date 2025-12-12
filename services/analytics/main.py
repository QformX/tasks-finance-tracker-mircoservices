from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router

app = FastAPI(
    title="Analytics Service",
    root_path="/stats",
    docs_url="/docs",
    openapi_url="/openapi.json",
    description="Сервис аналитики для агрегации событий и построения отчётов"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:1420", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router with all endpoints
app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "analytics"}
