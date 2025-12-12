import uuid
from sqlalchemy import String, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SmartView(Base):
    """
    Модель умного представления (фильтр задач/покупок)
    """
    __tablename__ = "smart_views"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    title: Mapped[str] = mapped_column(String)
    rules: Mapped[dict] = mapped_column(JSON)  # JSON rules for filtering
