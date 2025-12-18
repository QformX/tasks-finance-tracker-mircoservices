from pydantic import BaseModel
from typing import List, Dict, Any
from enum import Enum

class PeriodType(str, Enum):
    today = "today"
    week = "week"
    month = "month"
    year = "year"

class DashboardStats(BaseModel):
    total_events: int
    tasks_created: int
    tasks_completed: int
    purchases_created: int
    purchases_completed: int
    total_spending: float
    total_created_cost: float = 0.0
    total_incomplete_purchases_cost: float = 0.0
    overdue_tasks_count: int = 0
    tasks_due_period: int = 0
    completed_overdue_tasks_count: int = 0
    tasks_completed_due_period: int = 0
    period: str
    daily_stats: List[Dict[str, Any]] = []
    
    # New fields for extended dashboard
    tasks_created_by_priority: Dict[str, int] = {}
    tasks_completed_avg_time: float = 0.0
    purchases_pending_count: int = 0
    purchases_completed_avg_time: float = 0.0
    spending_by_category: Dict[str, float] = {}
    roi: float = 0.0
    forecast_needed: float = 0.0
    urgency_breakdown: Dict[str, float] = {}
    
    # Gamification & Productivity
    peak_productivity_hour: int | None = None
    current_streak: int = 0
    burnout_risk: bool = False

