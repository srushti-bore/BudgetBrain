"""
BudgetBrain — Refresh Token ORM Model

SRS §4.2:
  id          UUID         PK
  user_id     UUID         FK → users.id (CASCADE)
  token_hash  VARCHAR(64)  Required, indexed (SHA-256 hash)
  expires_at  TIMESTAMPTZ  Required, indexed
  revoked     BOOLEAN      Default false, indexed
  user_agent  VARCHAR(255) Nullable
  ip_address  VARCHAR(45)  Nullable
  created_at  TIMESTAMPTZ  Auto-managed
"""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, new_uuid, now_utc


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="refresh_tokens", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id!r} user_id={self.user_id!r} revoked={self.revoked}>"
