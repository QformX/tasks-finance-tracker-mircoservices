import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Task(Base):
    """
    Модель задачи
    """
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="tasks")

    # Composite index for "Today" queries
    __table_args__ = (
        Index("idx_tasks_user_due_date", "user_id", "due_date"),
    )
