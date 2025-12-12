from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agent import process_chat
from app.tools import broker
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to RabbitMQ on startup
    await broker.connect()
    yield
    # Close connection on shutdown
    await broker.close()

app = FastAPI(
    title="AI Service",
    lifespan=lifespan,
    root_path="/ai",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

class ChatRequest(BaseModel):
    message: str
    user_id: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        process_chat(request.message, request.user_id),
        media_type="text/plain"
    )
