from enum import Enum


class FilterType(str, Enum):
    """Типы фильтров для умных представлений"""
    today = "today"
    overdue = "overdue"
    inbox = "inbox"
