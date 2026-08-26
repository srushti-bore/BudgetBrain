"""
BudgetBrain — SQLAlchemy ORM Base + Timestamp Mixin

All models inherit from Base (DeclarativeBase) and TimestampMixin.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


class TimestampMixin:
    """
    Adds created_at and updated_at columns to any model.
    Both are auto-managed by the database (server_default + onupdate).
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


def new_uuid() -> str:
    """Generate a new UUID string — used as default for primary keys."""
    return str(uuid.uuid4())
