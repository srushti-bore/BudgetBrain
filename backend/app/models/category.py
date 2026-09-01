"""
BudgetBrain — Category ORM Model

SRS §4.3:
  id          UUID        PK
  user_id     UUID        FK → users.id (CASCADE)
  name        VARCHAR(50) Required, unique per user
  is_system   BOOLEAN     Default false; true only for "Uncategorized"
  created_at  TIMESTAMPTZ Auto-managed
  updated_at  TIMESTAMPTZ Auto-managed
"""

from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

# Name of the protected system category (SRS §3.3)
UNCATEGORIZED_NAME = "Uncategorized"


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_category_user_name"),
        Index("ix_categories_user_name", "user_id", "name"),
    )

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="categories", lazy="select"
    )
    expenses: Mapped[list["Expense"]] = relationship(  # noqa: F821
        "Expense", back_populates="category", lazy="select"
    )
    budgets: Mapped[list["Budget"]] = relationship(  # noqa: F821
        "Budget", back_populates="category", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id!r} user_id={self.user_id!r} name={self.name!r} system={self.is_system}>"
