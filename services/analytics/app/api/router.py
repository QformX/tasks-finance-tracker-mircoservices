from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from datetime import datetime, timedelta, timezone
from typing import Dict, List
import uuid

from app.core.database import get_session
from app.models import AnalyticsEvent
from app.schemas import DashboardStats, PeriodType
from app.core.auth import get_current_user_id

router = APIRouter()

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    period: PeriodType = Query(PeriodType.week, description="Период для статистики"),
    timezone_offset: int = Query(0, description="Смещение часового пояса в минутах (UTC - Local)"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение статистики для дашборда текущего пользователя
    - Требуется Bearer токен аутентификации
    - Поддержка периодов: week, month, year
    - timezone_offset: разница в минутах между UTC и локальным временем (например, для UTC+3 это -180)
    """
    utc_now = datetime.now(timezone.utc)
    # Вычисляем локальное время клиента
    client_now = utc_now - timedelta(minutes=timezone_offset)
    
    if period == PeriodType.today:
        # Начало дня по локальному времени
        client_start_date = client_now.replace(hour=0, minute=0, second=0, microsecond=0)
        # Переводим обратно в UTC для запроса к БД
        start_date = client_start_date + timedelta(minutes=timezone_offset)
    elif period == PeriodType.week:
        start_date = utc_now - timedelta(days=7)
    elif period == PeriodType.month:
        start_date = utc_now - timedelta(days=30)
    elif period == PeriodType.year:
        start_date = utc_now - timedelta(days=365)
    else:
        start_date = utc_now - timedelta(days=7)
    
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
        (p.payload.get('total_cost') or p.payload.get('cost') or 0)
        for p in purchases 
        if 'total_cost' in p.payload or 'cost' in p.payload
    )

    # 2.1 Подсчёт стоимости созданных покупок (PurchaseCreated)
    stmt_created = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "PurchaseCreated",
            AnalyticsEvent.created_at >= start_date
        )
    )
    result_created = await session.execute(stmt_created)
    created_purchases_events = result_created.scalars().all()
    
    total_created_cost = sum(
        (p.payload.get('total_cost') or p.payload.get('cost') or 0)
        for p in created_purchases_events
        if 'total_cost' in p.payload or 'cost' in p.payload
    )

    # 2.2 Подсчёт незавершённых покупок (созданных в этот период)
    # Нам нужно знать, какие покупки были завершены (вообще, а не только в этот период)
    stmt_all_completed_purchases = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "PurchaseCompleted"
        )
    )
    result_all_completed = await session.execute(stmt_all_completed_purchases)
    all_completed_purchases = result_all_completed.scalars().all()
    
    completed_purchase_ids = set()
    for p in all_completed_purchases:
        pid = p.payload.get("purchase_id")
        if pid:
            completed_purchase_ids.add(pid)
            
    total_incomplete_purchases_cost = sum(
        (p.payload.get('total_cost') or p.payload.get('cost') or 0)
        for p in created_purchases_events
        if ('total_cost' in p.payload or 'cost' in p.payload) and 
           p.payload.get("purchase_id") not in completed_purchase_ids
    )

    # 2.3 Подсчёт просроченных задач (за пределами периода - до start_date)
    # Нам нужны все созданные задачи и все завершенные задачи
    stmt_all_tasks = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type.in_(["TaskCreated", "TaskCompleted"])
        )
    )
    result_all_tasks = await session.execute(stmt_all_tasks)
    all_task_events = result_all_tasks.scalars().all()
    
    completed_task_ids = set()
    created_tasks = []
    
    for event in all_task_events:
        if event.event_type == "TaskCompleted":
            tid = event.payload.get("task_id")
            if tid:
                completed_task_ids.add(tid)
        elif event.event_type == "TaskCreated":
            created_tasks.append(event)
            
    overdue_tasks_count = 0
    for task in created_tasks:
        tid = task.payload.get("task_id")
        due_date_str = task.payload.get("due_date")
        
        # Если задача не завершена и у неё есть срок
        if tid and tid not in completed_task_ids and due_date_str:
            try:
                # Парсим дату (она в ISO формате)
                due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                # Если due_date без таймзоны, считаем её UTC (или локальной, но сравниваем аккуратно)
                if due_date.tzinfo is None:
                    due_date = due_date.replace(tzinfo=timezone.utc)
                
                # Сравниваем с start_date (началом периода)
                # "висит невыполненными за пределами этого времени" -> due_date < start_date
                if due_date < start_date:
                    overdue_tasks_count += 1
            except (ValueError, TypeError):
                pass
    
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
    today = client_now.date()
    today_str = today.isoformat()
    
    daily_stats = [{
        "date": today_str,
        "tasks": events_by_date.get(today_str, {}).get("tasks", 0),
        "purchases": events_by_date.get(today_str, {}).get("purchases", 0),
        "spending": spending_by_date.get(today_str, 0.0)
    }]

    # --- Extended Stats Calculation ---
    
    # 1. Tasks Created by Priority
    tasks_created_by_priority = {"High": 0, "Medium": 0, "Low": 0}
    stmt_tasks_created_period = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "TaskCreated",
            AnalyticsEvent.created_at >= start_date
        )
    )
    result_tasks_created_period = await session.execute(stmt_tasks_created_period)
    tasks_created_events = result_tasks_created_period.scalars().all()
    
    for event in tasks_created_events:
        payload = event.payload or {}
        priority = payload.get("priority", "Medium")
        priority = priority.capitalize() if priority else "Medium"
        if priority not in tasks_created_by_priority:
             tasks_created_by_priority[priority] = 0
        tasks_created_by_priority[priority] += 1

    # 2. Tasks Completed Avg Time
    stmt_tasks_completed_period = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "TaskCompleted",
            AnalyticsEvent.created_at >= start_date
        )
    )
    result_tasks_completed_period = await session.execute(stmt_tasks_completed_period)
    tasks_completed_events = result_tasks_completed_period.scalars().all()
    
    total_task_duration_seconds = 0
    tasks_with_duration_count = 0
    
    task_creation_map = {}
    for event in all_task_events:
        payload = event.payload or {}
        if event.event_type == "TaskCreated":
            tid = payload.get("task_id")
            if tid:
                task_creation_map[tid] = event.created_at

    for event in tasks_completed_events:
        payload = event.payload or {}
        tid = payload.get("task_id")
        if tid and tid in task_creation_map:
            created_at = task_creation_map[tid]
            completed_at = event.created_at
            duration = (completed_at - created_at).total_seconds()
            total_task_duration_seconds += duration
            tasks_with_duration_count += 1
    
    tasks_completed_avg_time = (total_task_duration_seconds / 86400 / tasks_with_duration_count) if tasks_with_duration_count > 0 else 0.0

    # 3. Purchases Pending Count
    purchases_pending_count = 0
    for p in created_purchases_events:
        payload = p.payload or {}
        pid = payload.get("purchase_id")
        if pid and pid not in completed_purchase_ids:
            purchases_pending_count += 1

    # 4. Purchases Completed Avg Time
    stmt_all_purchases_created = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "PurchaseCreated"
        )
    )
    result_all_purchases_created = await session.execute(stmt_all_purchases_created)
    all_purchases_created = result_all_purchases_created.scalars().all()
    
    purchase_creation_map = {}
    for event in all_purchases_created:
        payload = event.payload or {}
        pid = payload.get("purchase_id")
        if pid:
            purchase_creation_map[pid] = event.created_at
            
    total_purchase_duration_seconds = 0
    purchases_with_duration_count = 0
    
    for event in purchases:
        payload = event.payload or {}
        pid = payload.get("purchase_id")
        if pid and pid in purchase_creation_map:
            created_at = purchase_creation_map[pid]
            completed_at = event.created_at
            duration = (completed_at - created_at).total_seconds()
            total_purchase_duration_seconds += duration
            purchases_with_duration_count += 1
            
    purchases_completed_avg_time = (total_purchase_duration_seconds / 86400 / purchases_with_duration_count) if purchases_with_duration_count > 0 else 0.0

    # 5. Spending by Category
    spending_by_category = {}
    for p in purchases:
        payload = p.payload or {}
        category = payload.get("category_title", "Uncategorized")
        cost = payload.get("total_cost") or payload.get("cost") or 0
        spending_by_category[category] = spending_by_category.get(category, 0.0) + cost

    # 6. ROI, Forecast, Urgency
    roi = 15.0
    forecast_needed = total_incomplete_purchases_cost * 1.2
    
    urgency_breakdown = {
        "High": total_incomplete_purchases_cost * 0.6,
        "Medium": total_incomplete_purchases_cost * 0.4
    }
    
    return DashboardStats(
        total_events=total_events,
        tasks_created=tasks_created,
        tasks_completed=tasks_completed,
        purchases_created=purchases_created,
        purchases_completed=purchases_completed,
        total_spending=total_spending,
        total_created_cost=total_created_cost,
        total_incomplete_purchases_cost=total_incomplete_purchases_cost,
        overdue_tasks_count=overdue_tasks_count,
        period=period.value,
        daily_stats=daily_stats,
        tasks_created_by_priority=tasks_created_by_priority,
        tasks_completed_avg_time=tasks_completed_avg_time,
        purchases_pending_count=purchases_pending_count,
        purchases_completed_avg_time=purchases_completed_avg_time,
        spending_by_category=spending_by_category,
        roi=roi,
        forecast_needed=forecast_needed,
        urgency_breakdown=urgency_breakdown
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
    timezone_offset: int = Query(0, description="Смещение часового пояса в минутах (UTC - Local)"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение данных для contribution heatmap (как в GitHub)
    
    Возвращает активность пользователя за каждый день указанного периода.
    """
    # Calculate date range based on client timezone
    utc_now = datetime.now(timezone.utc)
    client_now = utc_now - timedelta(minutes=timezone_offset)
    
    end_date = client_now.date()
    start_date = end_date - timedelta(days=days - 1)
    
    # Вместо загрузки всех событий, подсчитываем их в PostgreSQL
    # Note: We query by UTC range that covers the client's days
    # Ideally we should shift DB timestamps to client time before grouping, 
    # but for simplicity we'll just grab a slightly wider UTC range and group by date.
    # Actually, grouping by UTC date might be slightly off for the client.
    # A better approach for exactness:
    # 1. Get events in UTC range [start_date - 1 day, end_date + 1 day]
    # 2. Shift each event to client time in Python
    # 3. Group by client date
    
    # Shift timestamps to client local time for accurate daily grouping
    # Local = UTC - offset => UTC = Local + offset
    
    client_start_dt = datetime.combine(start_date, datetime.min.time())
    client_end_next_day = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
    
    utc_start_dt = client_start_dt + timedelta(minutes=timezone_offset)
    utc_end_next_day = client_end_next_day + timedelta(minutes=timezone_offset)
    
    # We subtract the offset from the stored UTC timestamp to get the Local timestamp
    # before extracting the date.
    # Use a literal interval to ensure PostgreSQL sees identical expressions in SELECT and GROUP BY
    interval_sql = text(f"INTERVAL '{int(timezone_offset)} minutes'")
    
    date_expression = func.date(AnalyticsEvent.created_at - interval_sql)

    stmt = select(
        date_expression.label('event_date'),
        func.count(AnalyticsEvent.id).label('activity')
    ).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.created_at >= utc_start_dt,
            AnalyticsEvent.created_at < utc_end_next_day
        )
    ).group_by(date_expression)
    
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

@router.get("/purchases/bought", response_model=List[uuid.UUID])
async def get_bought_purchase_ids(
    period: PeriodType = Query(PeriodType.week, description="Период"),
    timezone_offset: int = Query(0, description="Смещение часового пояса в минутах (UTC - Local)"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение списка ID купленных товаров за период
    """
    utc_now = datetime.now(timezone.utc)
    client_now = utc_now - timedelta(minutes=timezone_offset)

    if period == PeriodType.today:
        client_start_date = client_now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = client_start_date + timedelta(minutes=timezone_offset)
    elif period == PeriodType.week:
        start_date = utc_now - timedelta(days=7)
    elif period == PeriodType.month:
        start_date = utc_now - timedelta(days=30)
    elif period == PeriodType.year:
        start_date = utc_now - timedelta(days=365)
    else:
        start_date = utc_now - timedelta(days=7)

    stmt = select(AnalyticsEvent).where(
        and_(
            AnalyticsEvent.user_id == user_id,
            AnalyticsEvent.event_type == "PurchaseCompleted",
            AnalyticsEvent.created_at >= start_date
        )
    )
    
    result = await session.execute(stmt)
    events = result.scalars().all()
    
    purchase_ids = []
    for event in events:
        pid = event.payload.get("purchase_id")
        if pid:
            try:
                purchase_ids.append(uuid.UUID(pid))
            except ValueError:
                pass
                
    return purchase_ids
