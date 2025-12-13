import uuid
from typing import List
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Category(Base):
    """
    Модель категории для группировки задач и покупок
    """
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    title: Mapped[str] = mapped_column(String, index=True)
    type: Mapped[str] = mapped_column(String)  # 'tasks', 'purchases', 'mixed'
    color: Mapped[str] = mapped_column(String, nullable=True)
    icon: Mapped[str] = mapped_column(String, nullable=True)

    # Relationships
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="category")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="category")
