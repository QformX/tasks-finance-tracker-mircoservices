from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

class SyncMixin:
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        nullable=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=True)
