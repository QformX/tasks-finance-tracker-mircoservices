from fastapi import FastAPI, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import Dict, List
import uuid

from services.analytics.database import get_session
from services.analytics.models import AnalyticsEvent
from services.analytics.schemas import DashboardStats, PeriodType
from services.analytics.auth import get_current_user_id

app = FastAPI(
    title="Analytics Service",
    root_path="/stats",
    docs_url="/docs",
    openapi_url="/openapi.json",
    description="Сервис аналитики для агрегации событий и построения отчётов"
)

@app.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    period: PeriodType = Query(PeriodType.week, description="Период для статистики"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение статистики для дашборда текущего пользователя
    - Требуется Bearer токен аутентификации
    - Агрегация событий из Analytics DB (OLAP) только для текущего пользователя
    - Поддержка периодов: week, month, year
    - Группировка по дням для графиков
    """
    # Calculate date range
    now = datetime.utcnow()
    if period == PeriodType.week:
        start_date = now - timedelta(days=7)
    elif period == PeriodType.month:
        start_date = now - timedelta(days=30)
    elif period == PeriodType.year:
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)
    
    # Query total events for current user
    stmt_total = select(func.count(AnalyticsEvent.id)).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= start_date
        )
    )
    total_events = await session.scalar(stmt_total) or 0
    
    # Query events by type for current user
    stmt_events = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= start_date
        )
    )
    result = await session.execute(stmt_events)
    events = result.scalars().all()
    
    # Aggregate statistics
    tasks_created = 0
    tasks_completed = 0
    purchases_created = 0
    purchases_completed = 0
    total_spending = 0.0
    
    daily_stats_dict: Dict[str, Dict] = {}
    
    for event in events:
        event_type = event.event_type
        payload = event.payload
        
        # Count by type
        if event_type == "TaskCreated":
            tasks_created += 1
        elif event_type == "TaskCompleted":
            tasks_completed += 1
        elif event_type == "PurchaseCreated":
            purchases_created += 1
        elif event_type == "PurchaseCompleted":
            purchases_completed += 1
            # Calculate spending
            if "total_cost" in payload:
                total_spending += payload["total_cost"]
        
        # Group by day for charts
        event_date = event.created_at.date().isoformat()
        if event_date not in daily_stats_dict:
            daily_stats_dict[event_date] = {
                "date": event_date,
                "tasks": 0,
                "purchases": 0,
                "spending": 0.0
            }
        
        if event_type in ["TaskCreated", "TaskCompleted"]:
            daily_stats_dict[event_date]["tasks"] += 1
        elif event_type in ["PurchaseCreated", "PurchaseCompleted"]:
            daily_stats_dict[event_date]["purchases"] += 1
        
        if event_type == "PurchaseCompleted" and "total_cost" in payload:
            daily_stats_dict[event_date]["spending"] += payload["total_cost"]
    
    # Convert to list and sort
    daily_stats = sorted(daily_stats_dict.values(), key=lambda x: x["date"])
    
    return DashboardStats(
        total_events=total_events,
        tasks_created=tasks_created,
        tasks_completed=tasks_completed,
        purchases_created=purchases_created,
        purchases_completed=purchases_completed,
        total_spending=total_spending,
        period=period.value,
        daily_stats=daily_stats
    )

@app.get("/events/count")
async def get_events_count(
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """Получение общего количества событий текущего пользователя"""
    stmt = select(func.count(AnalyticsEvent.id)).where(
        AnalyticsEvent.user_id == user_id
    )
    result = await session.execute(stmt)
    count = result.scalar()
    return {"total_events": count}

@app.get("/events/recent")
async def get_recent_events(
    limit: int = Query(10, ge=1, le=100),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """Получение последних событий текущего пользователя"""
    stmt = select(AnalyticsEvent).where(
        AnalyticsEvent.user_id == user_id
    ).order_by(
        AnalyticsEvent.created_at.desc()
    ).limit(limit)
    
    result = await session.execute(stmt)
    events = result.scalars().all()
    
    return {
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "payload": e.payload,
                "created_at": e.created_at.isoformat()
            }
            for e in events
        ]
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "analytics"}
