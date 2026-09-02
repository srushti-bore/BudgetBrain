"""
BudgetBrain — User ORM Model

SRS §4.1:
  id              UUID         PK
  email           VARCHAR(255) Required, unique, indexed (lowercase)
  hashed_password VARCHAR(255) Nullable (null for Google OAuth-only accounts)
  full_name       VARCHAR(100) Nullable
  avatar_url      VARCHAR(500) Nullable
  google_id       VARCHAR(100) Nullable, unique, indexed
  is_active       BOOLEAN      Default true
  is_verified     BOOLEAN      Default false (true for Google)
  created_at      TIMESTAMPTZ  Auto-managed
  updated_at      TIMESTAMPTZ  Auto-managed
"""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    hashed_password: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    full_name: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    avatar_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    google_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    otp_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    otp_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(  # noqa: F821
        "RefreshToken", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    categories: Mapped[list["Category"]] = relationship(  # noqa: F821
        "Category", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    expenses: Mapped[list["Expense"]] = relationship(  # noqa: F821
        "Expense", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    budgets: Mapped[list["Budget"]] = relationship(  # noqa: F821
        "Budget", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r} active={self.is_active}>"
