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
    period: str
    daily_stats: List[Dict[str, Any]] = []
