"""
BudgetBrain — Expense Embedding ORM Model (RAG Knowledge Store)

Stores vector embeddings of expenses for semantic retrieval in AI Chat & Search.
Compatible with Supabase pgvector and JSON fallback.
"""

from typing import Any
from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class ExpenseEmbedding(Base, TimestampMixin):
    __tablename__ = "expense_embeddings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expense_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    content: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    # Stored as JSON array of floats for universal driver compatibility
    # When pgvector is available, vector operations use raw SQL / match_expenses RPC
    embedding_json: Mapped[list[float] | None] = mapped_column(
        JSONB, nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        "User", lazy="select"
    )
    expense: Mapped["Expense"] = relationship(  # noqa: F821
        "Expense", lazy="select"
    )

    __table_args__ = (
        Index("ix_expense_embeddings_user_expense", "user_id", "expense_id"),
    )

    def __repr__(self) -> str:
        return f"<ExpenseEmbedding id={self.id!r} user_id={self.user_id!r} expense_id={self.expense_id!r}>"
