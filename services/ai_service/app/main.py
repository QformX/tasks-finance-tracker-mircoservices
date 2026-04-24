from fastapi import FastAPI, Depends, Response, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agent import process_chat
from app.tools import broker
from app.auth import get_current_user_id
from contextlib import asynccontextmanager

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.tools import broker
from app.api.chat import router as chat_router
from app.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to RabbitMQ on startup
    await broker.connect()
    # Initialize DB - handled by Alembic now
    # await init_db()
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:1420", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
