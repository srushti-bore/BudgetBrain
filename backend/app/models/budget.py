"""
BudgetBrain — Budget ORM Model

SRS §4.3:
  id            UUID         PK
  category_id   UUID         Nullable — null = overall budget; cascades on category delete
  period_type   VARCHAR(10)  monthly | weekly; default monthly
  period_start  DATE         Required
  limit_amount  NUMERIC(10,2) Required, > 0
  created_at    TIMESTAMPTZ  Auto-managed
  updated_at    TIMESTAMPTZ  Auto-managed

Uniqueness: one budget per (category_id OR NULL) per period.
"""

import enum
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Numeric, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class PeriodType(str, enum.Enum):
    MONTHLY = "monthly"
    WEEKLY = "weekly"  # Reserved for future phases (SRS §3.6)


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    category_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,   # NULL = overall monthly budget
        index=True,
    )
    period_type: Mapped[str] = mapped_column(
        String(10), nullable=False, default=PeriodType.MONTHLY
    )
    period_start: Mapped[date] = mapped_column(
        Date, nullable=False
    )
    limit_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    daily_limit: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )

    # Relationships
    category: Mapped["Category | None"] = relationship(  # noqa: F821
        "Category", back_populates="budgets", lazy="select"
    )

    # Uniqueness: one budget per category (or overall) per period
    __table_args__ = (
        UniqueConstraint(
            "category_id", "period_type", "period_start",
            name="uq_budget_category_period",
        ),
        # Partial unique index for overall budgets (category_id IS NULL)
        # PostgreSQL treats NULL != NULL, so the UniqueConstraint above
        # cannot prevent duplicate overall budgets — this index does.
        Index(
            "uq_budget_overall_period",
            "period_type", "period_start",
            unique=True,
            postgresql_where=text("category_id IS NULL"),
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Budget id={self.id!r} category_id={self.category_id!r} "
            f"period={self.period_type} start={self.period_start} "
            f"limit={self.limit_amount} daily_limit={self.daily_limit}>"
        )
