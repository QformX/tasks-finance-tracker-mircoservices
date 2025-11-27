import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Float, Integer, ForeignKey, Index, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from services.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    title: Mapped[str] = mapped_column(String, index=True)
    type: Mapped[str] = mapped_column(String) # 'tasks', 'purchases', 'mixed'

    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="category")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="category")

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="tasks")

    # Composite index for "Today" queries
    __table_args__ = (
        Index("idx_tasks_user_due_date", "user_id", "due_date"),
    )

class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    is_bought: Mapped[bool] = mapped_column(Boolean, default=False)
    cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="purchases")

class SmartView(Base):
    __tablename__ = "smart_views"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    title: Mapped[str] = mapped_column(String)
    rules: Mapped[dict] = mapped_column(JSON) # JSON rules for filtering

