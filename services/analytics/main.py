from fastapi import FastAPI

from services.analytics.router import router

app = FastAPI(
    title="Analytics Service",
    root_path="/stats",
    docs_url="/docs",
    openapi_url="/openapi.json",
    description="Сервис аналитики для агрегации событий и построения отчётов"
)

# Include router with all endpoints
app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "analytics"}
