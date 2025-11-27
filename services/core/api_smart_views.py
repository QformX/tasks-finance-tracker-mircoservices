from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from typing import List, Dict, Any, Union
import uuid

from services.core.database import get_db_master, get_db_replica
from services.core.models import SmartView, Task, Purchase
from services.core.schemas import SmartViewCreate, SmartViewResponse, TaskResponse, PurchaseResponse
from services.core.auth import get_current_user_id

router = APIRouter(prefix="/smart-views", tags=["smart-views"])

@router.post("/", response_model=SmartViewResponse, status_code=status.HTTP_201_CREATED)
async def create_smart_view(
    view_in: SmartViewCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """
    Создание умного фильтра
    - Сохранение JSON правил в БД
    Пример rules: 
    {
        "type": "tasks",  # or "purchases"
        "filters": {
            "is_completed": false,
            "category_id": "uuid-here",
            "due_date_from": "2025-01-01"
        }
    }
    """
    new_view = SmartView(
        user_id=user_id,
        title=view_in.title,
        rules=view_in.rules
    )
    
    session.add(new_view)
    await session.commit()
    await session.refresh(new_view)
    
    return new_view

@router.get("/", response_model=List[SmartViewResponse])
async def get_smart_views(
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_replica)  # READ from REPLICA
):
    """Получение списка умных фильтров пользователя"""
    stmt = select(SmartView).where(SmartView.user_id == user_id)
    result = await session.execute(stmt)
    views = result.scalars().all()
    
    return views

@router.get("/{view_id}/items", response_model=List[Union[TaskResponse, PurchaseResponse]])
async def get_smart_view_items(
    view_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_replica)  # READ from REPLICA
):
    """
    Получение элементов по умному фильтру
    - Динамический Query Builder на основе JSON правил
    - Выполнение запроса к Replica DB
    """
    # 1. Get SmartView
    view = await session.get(SmartView, view_id)
    if not view or view.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Smart view not found")
    
    rules = view.rules
    view_type = rules.get("type", "tasks")  # "tasks" or "purchases"
    filters = rules.get("filters", {})
    
    # 2. Build dynamic query based on type
    if view_type == "tasks":
        stmt = select(Task).where(Task.user_id == user_id)
        
        # Apply filters dynamically
        if "is_completed" in filters:
            stmt = stmt.where(Task.is_completed == filters["is_completed"])
        
        if "category_id" in filters:
            try:
                cat_id = uuid.UUID(filters["category_id"])
                stmt = stmt.where(Task.category_id == cat_id)
            except ValueError:
                pass
        
        if "due_date_from" in filters:
            from datetime import datetime
            try:
                date_from = datetime.fromisoformat(filters["due_date_from"])
                stmt = stmt.where(Task.due_date >= date_from)
            except ValueError:
                pass
        
        if "due_date_to" in filters:
            from datetime import datetime
            try:
                date_to = datetime.fromisoformat(filters["due_date_to"])
                stmt = stmt.where(Task.due_date <= date_to)
            except ValueError:
                pass
        
        stmt = stmt.order_by(Task.created_at.desc())
        
    elif view_type == "purchases":
        stmt = select(Purchase).where(Purchase.user_id == user_id)
        
        # Apply filters dynamically
        if "is_bought" in filters:
            stmt = stmt.where(Purchase.is_bought == filters["is_bought"])
        
        if "category_id" in filters:
            try:
                cat_id = uuid.UUID(filters["category_id"])
                stmt = stmt.where(Purchase.category_id == cat_id)
            except ValueError:
                pass
        
        if "min_cost" in filters:
            stmt = stmt.where(Purchase.cost >= filters["min_cost"])
        
        if "max_cost" in filters:
            stmt = stmt.where(Purchase.cost <= filters["max_cost"])
        
        stmt = stmt.order_by(Purchase.id.desc())
    
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid view type")
    
    # 3. Execute query
    result = await session.execute(stmt)
    items = result.scalars().all()
    
    return items

@router.delete("/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_smart_view(
    view_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_master)  # WRITE to MASTER
):
    """Удаление умного фильтра"""
    view = await session.get(SmartView, view_id)
    if not view or view.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Smart view not found")
    
    await session.delete(view)
    await session.commit()
    
    return None

