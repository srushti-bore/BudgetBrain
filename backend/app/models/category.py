"""
BudgetBrain — Category ORM Model

SRS §4.1:
  id          UUID        PK
  name        VARCHAR(50) Required, unique
  is_system   BOOLEAN     Default false; true only for "Uncategorized"
  created_at  TIMESTAMPTZ Auto-managed
  updated_at  TIMESTAMPTZ Auto-managed
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

# Name of the protected system category (SRS §3.3)
UNCATEGORIZED_NAME = "Uncategorized"


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    name: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Relationships
    expenses: Mapped[list["Expense"]] = relationship(  # noqa: F821
        "Expense", back_populates="category", lazy="select"
    )
    budgets: Mapped[list["Budget"]] = relationship(  # noqa: F821
        "Budget", back_populates="category", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id!r} name={self.name!r} system={self.is_system}>"
