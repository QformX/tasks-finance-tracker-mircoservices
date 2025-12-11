from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Dict
import uuid

from app.core.database import get_session
from app.models import AnalyticsEvent
from app.schemas import DashboardStats, PeriodType
from app.core.auth import get_current_user_id

router = APIRouter()

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    period: PeriodType = Query(PeriodType.week, description="Период для статистики"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение статистики для дашборда текущего пользователя
    - Требуется Bearer токен аутентификации
    - Поддержка периодов: week, month, year
    """
    now = datetime.now(timezone.utc)
    if period == PeriodType.week:
        start_date = now - timedelta(days=7)
    elif period == PeriodType.month:
        start_date = now - timedelta(days=30)
    elif period == PeriodType.year:
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)
    
    # 1. Подсчёт событий по типам (одним запросом)
    stmt_by_type = select(
        AnalyticsEvent.event_type,
        func.count(AnalyticsEvent.id).label('count')
    ).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= start_date
        )
    ).group_by(AnalyticsEvent.event_type)
    
    result_by_type = await session.execute(stmt_by_type)
    type_counts = {row.event_type: row.count for row in result_by_type}
    
    tasks_created = type_counts.get("TaskCreated", 0)
    tasks_completed = type_counts.get("TaskCompleted", 0)
    purchases_created = type_counts.get("PurchaseCreated", 0)
    purchases_completed = type_counts.get("PurchaseCompleted", 0)
    total_events = sum(type_counts.values())
    
    # 2. Подсчёт расходов (только для PurchaseCompleted)
    # Загружаем только события PurchaseCompleted (обычно их немного)
    stmt_purchases = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "PurchaseCompleted",
            AnalyticsEvent.created_at >= start_date
        )
    )
    
    result_purchases = await session.execute(stmt_purchases)
    purchases = result_purchases.scalars().all()
    
    total_spending = sum(
        p.payload.get('total_cost') or p.payload.get('cost', 0)
        for p in purchases 
        if 'total_cost' in p.payload or 'cost' in p.payload
    )
    
    # 3. Группировка по дням с разбивкой по типам
    # Группируем по дате и типу события
    stmt_daily = select(
        func.date(AnalyticsEvent.created_at).label('event_date'),
        AnalyticsEvent.event_type,
        func.count(AnalyticsEvent.id).label('count')
    ).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= start_date
        )
    ).group_by(
        func.date(AnalyticsEvent.created_at),
        AnalyticsEvent.event_type
    )
    
    result_daily = await session.execute(stmt_daily)
    
    # Собираем данные по событиям
    events_by_date: Dict[str, Dict] = {}
    for row in result_daily:
        date_str = row.event_date.isoformat()
        
        if date_str not in events_by_date:
            events_by_date[date_str] = {"tasks": 0, "purchases": 0}
        
        # Разделяем по типам событий
        if row.event_type in ["TaskCreated", "TaskCompleted"]:
            events_by_date[date_str]["tasks"] += row.count
        elif row.event_type in ["PurchaseCreated", "PurchaseCompleted"]:
            events_by_date[date_str]["purchases"] += row.count
    
    # Собираем spending по датам
    spending_by_date: Dict[str, float] = {}
    for purchase in purchases:
        purchase_date = purchase.created_at.date().isoformat()
        if 'total_cost' in purchase.payload:
            spending_by_date[purchase_date] = spending_by_date.get(purchase_date, 0.0) + purchase.payload['total_cost']
    
    # Генерируем daily_stats ТОЛЬКО для сегодняшнего дня
    today = now.date()
    today_str = today.isoformat()
    
    daily_stats = [{
        "date": today_str,
        "tasks": events_by_date.get(today_str, {}).get("tasks", 0),
        "purchases": events_by_date.get(today_str, {}).get("purchases", 0),
        "spending": spending_by_date.get(today_str, 0.0)
    }]
    
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

@router.get("/events/count")
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

@router.get("/events/recent")
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

@router.get("/activity-heatmap")
async def get_activity_heatmap(
    days: int = Query(365, ge=7, le=365, description="Количество дней для отображения (7-365)"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение данных для contribution heatmap (как в GitHub)
    
    Возвращает активность пользователя за каждый день указанного периода.
    """
    # Calculate date range
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days - 1)
    
    # Вместо загрузки всех событий, подсчитываем их в PostgreSQL
    stmt = select(
        func.date(AnalyticsEvent.created_at).label('event_date'),
        func.count(AnalyticsEvent.id).label('activity')
    ).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= datetime.combine(start_date, datetime.min.time()),
            AnalyticsEvent.created_at <= datetime.combine(end_date, datetime.max.time())
        )
    ).group_by(func.date(AnalyticsEvent.created_at))
    
    result = await session.execute(stmt)
    activity_by_date: Dict[str, int] = {
        row.event_date.isoformat(): row.activity 
        for row in result
    }
    
    # Generate heatmap with ALL days (including zero activity)
    heatmap = []
    current_date = start_date
    total_activity = 0
    
    while current_date <= end_date:
        date_str = current_date.isoformat()
        activity = activity_by_date.get(date_str, 0)
        total_activity += activity
        
        heatmap.append({
            "date": date_str,
            "activity": activity
        })
        
        current_date += timedelta(days=1)
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_days": len(heatmap),
        "total_activity": total_activity,
        "heatmap": heatmap
    }
