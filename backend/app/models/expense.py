"""
BudgetBrain — Expense ORM Model

SRS §4.2:
  id            UUID         PK
  title         VARCHAR(50)  Required
  amount        NUMERIC(10,2) Required, > 0
  category_id   UUID         FK → categories, restrict on delete
  date          DATE         Required, cannot be in future
  notes         TEXT         Optional
  payment_mode  VARCHAR(20)  Optional: cash / card / upi / other
  created_at    TIMESTAMPTZ  Auto-managed
  updated_at    TIMESTAMPTZ  Auto-managed

Indexed on: date, category_id, amount, full-text (trigram) on title + notes.
"""

import enum
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class PaymentMode(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    OTHER = "other"


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    title: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    amount: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_mode: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )

    # Relationships
    category: Mapped["Category"] = relationship(  # noqa: F821
        "Category", back_populates="expenses", lazy="select"
    )

    # Composite + full-text indexes (defined at table level)
    __table_args__ = (
        Index("ix_expenses_date_category", "date", "category_id"),
        Index("ix_expenses_amount", "amount"),
        # NOTE: Trigram (GIN) index for full-text search on title + notes
        # is handled in an Alembic migration using raw SQL:
        #   CREATE INDEX ix_expenses_fts ON expenses USING gin(
        #       to_tsvector('english', title || ' ' || coalesce(notes, ''))
        #   );
    )

    def __repr__(self) -> str:
        return (
            f"<Expense id={self.id!r} title={self.title!r} "
            f"amount={self.amount} date={self.date}>"
        )
