from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.chat import ChatRequest
from app.agent import process_chat
from app.auth import get_current_user_id
from app.database import get_session, SessionLocal
from app.models import ChatMessage

router = APIRouter()

@router.get("/history")
async def get_chat_history(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.timestamp.asc())
    )
    messages = result.scalars().all()
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat() if msg.timestamp else None
        }
        for msg in messages
    ]

@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest, 
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    # Save user message
    user_msg = ChatMessage(user_id=user_id, role="user", content=request.message)
    session.add(user_msg)
    await session.commit()

    async def response_generator():
        full_response = ""
        async for chunk in process_chat(request.message, user_id):
            full_response += chunk
            yield chunk
        
        # Save assistant message
        async with SessionLocal() as db:
            assistant_msg = ChatMessage(user_id=user_id, role="assistant", content=full_response)
            db.add(assistant_msg)
            await db.commit()

    return StreamingResponse(
        response_generator(),
        media_type="text/plain"
    )
