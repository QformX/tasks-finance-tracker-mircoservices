from pydantic import BaseModel
from typing import List, Dict, Any
from enum import Enum

class PeriodType(str, Enum):
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
    period: str
    daily_stats: List[Dict[str, Any]] = []
