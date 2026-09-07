"""
BudgetBrain — RAG Service (Retrieval Augmented Generation)

Orchestrates semantic search, document ingestion, and vector indexing for user expenses.
Supports native Supabase pgvector cosine matching with graceful local JSON fallback.
"""

import json
import math
from typing import Any
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import new_uuid
from app.models.category import Category
from app.models.expense import Expense
from app.services.ai.embedding_service import EmbeddingService


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class RAGService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.embedding_service = EmbeddingService()
        self._has_native_vector: bool | None = None

    async def _check_has_native_vector(self) -> bool:
        """Checks if the table has a native 'embedding' vector column."""
        if self._has_native_vector is not None:
            return self._has_native_vector

        try:
            res = await self.session.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'expense_embeddings' AND column_name = 'embedding'"
                )
            )
            self._has_native_vector = res.scalar() is not None
        except Exception:
            self._has_native_vector = False

        return self._has_native_vector

    async def index_expense(
        self,
        expense: Expense,
        category_name: str | None = None,
        currency_symbol: str = "₹",
    ) -> None:
        """
        Formats an expense into a document string, generates its 768-dim embedding,
        and saves or updates it in the expense_embeddings table.
        """
        content = self.embedding_service.format_expense_document(
            title=expense.title,
            amount=float(expense.amount),
            category_name=category_name,
            date_val=expense.date,
            payment_mode=expense.payment_mode,
            mood=expense.mood,
            notes=expense.notes,
            currency_symbol=currency_symbol,
        )

        vector = await self.embedding_service.get_embedding(content)
        has_native_vector = await self._check_has_native_vector()

        if has_native_vector:
            # Native pgvector on Supabase
            vec_str = "[" + ",".join(f"{x:.6f}" for x in vector) + "]"
            sql = text(
                """
                INSERT INTO expense_embeddings (id, user_id, expense_id, content, embedding, updated_at)
                VALUES (:id, :user_id, :expense_id, :content, CAST(:embedding AS vector), CURRENT_TIMESTAMP)
                ON CONFLICT (expense_id) DO UPDATE
                SET content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    updated_at = CURRENT_TIMESTAMP;
                """
            )
            await self.session.execute(
                sql,
                {
                    "id": new_uuid(),
                    "user_id": str(expense.user_id),
                    "expense_id": str(expense.id),
                    "content": content,
                    "embedding": vec_str,
                },
            )
        else:
            # Local dev fallback using JSONB
            sql = text(
                """
                INSERT INTO expense_embeddings (id, user_id, expense_id, content, embedding_json, updated_at)
                VALUES (:id, :user_id, :expense_id, :content, CAST(:embedding_json AS jsonb), CURRENT_TIMESTAMP)
                ON CONFLICT (expense_id) DO UPDATE
                SET content = EXCLUDED.content,
                    embedding_json = EXCLUDED.embedding_json,
                    updated_at = CURRENT_TIMESTAMP;
                """
            )
            await self.session.execute(
                sql,
                {
                    "id": new_uuid(),
                    "user_id": str(expense.user_id),
                    "expense_id": str(expense.id),
                    "content": content,
                    "embedding_json": json.dumps(vector),
                },
            )

    async def delete_expense_index(self, expense_id: str, user_id: str) -> None:
        """Deletes vector embedding for a removed expense."""
        try:
            await self.session.execute(
                text(
                    "DELETE FROM expense_embeddings WHERE expense_id = :expense_id AND user_id = :user_id"
                ),
                {"expense_id": str(expense_id), "user_id": str(user_id)},
            )
        except Exception:
            pass

    async def search_similar_expenses(
        self,
        user_id: str,
        query: str,
        limit: int = 5,
        threshold: float = 0.25,
    ) -> list[dict[str, Any]]:
        """
        Performs semantic cosine search across the user's indexed expenses.
        Returns top matching transactions with content, similarity, and metadata.
        """
        cleaned_query = query.strip()
        if not cleaned_query:
            return []

        query_vector = await self.embedding_service.get_embedding(cleaned_query)
        has_native_vector = await self._check_has_native_vector()

        results: list[dict[str, Any]] = []

        if has_native_vector:
            vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vector) + "]"
            sql = text(
                """
                SELECT
                    ee.id,
                    ee.expense_id,
                    ee.content,
                    CAST(1 - (ee.embedding <=> CAST(:qvec AS vector)) AS FLOAT) AS similarity,
                    e.title,
                    e.amount,
                    e.date,
                    c.name as category_name
                FROM expense_embeddings ee
                JOIN expenses e ON e.id = ee.expense_id
                LEFT JOIN categories c ON c.id = e.category_id
                WHERE ee.user_id = :user_id
                  AND (1 - (ee.embedding <=> CAST(:qvec AS vector))) > :threshold
                ORDER BY ee.embedding <=> CAST(:qvec AS vector)
                LIMIT :limit;
                """
            )
            res = await self.session.execute(
                sql,
                {
                    "qvec": vec_str,
                    "user_id": str(user_id),
                    "threshold": threshold,
                    "limit": limit,
                },
            )
            for row in res.fetchall():
                results.append(
                    {
                        "id": row.id,
                        "expense_id": row.expense_id,
                        "content": row.content,
                        "similarity": round(float(row.similarity), 3),
                        "title": row.title,
                        "amount": float(row.amount),
                        "date": str(row.date),
                        "category_name": row.category_name,
                    }
                )
        else:
            # Fallback for local dev without C vector extension
            sql = text(
                """
                SELECT
                    ee.id,
                    ee.expense_id,
                    ee.content,
                    ee.embedding_json,
                    e.title,
                    e.amount,
                    e.date,
                    c.name as category_name
                FROM expense_embeddings ee
                JOIN expenses e ON e.id = ee.expense_id
                LEFT JOIN categories c ON c.id = e.category_id
                WHERE ee.user_id = :user_id;
                """
            )
            res = await self.session.execute(sql, {"user_id": str(user_id)})
            candidates = []
            for row in res.fetchall():
                emb = row.embedding_json
                if isinstance(emb, str):
                    emb = json.loads(emb)
                sim = _cosine_similarity(query_vector, emb)
                if sim >= threshold:
                    candidates.append(
                        {
                            "id": row.id,
                            "expense_id": row.expense_id,
                            "content": row.content,
                            "similarity": round(float(sim), 3),
                            "title": row.title,
                            "amount": float(row.amount),
                            "date": str(row.date),
                            "category_name": row.category_name,
                        }
                    )
            candidates.sort(key=lambda x: x["similarity"], reverse=True)
            results = candidates[:limit]

        return results

    async def sync_all_user_expenses(self, user_id: str) -> dict[str, int]:
        """
        Backfills and indexes all user expenses that do not yet have an embedding.
        Returns count of indexed items.
        """
        # Find expenses for user without an embedding
        sql = text(
            """
            SELECT e.id
            FROM expenses e
            LEFT JOIN expense_embeddings ee ON ee.expense_id = e.id
            WHERE e.user_id = :user_id AND ee.id IS NULL;
            """
        )
        missing_res = await self.session.execute(sql, {"user_id": str(user_id)})
        missing_ids = [row[0] for row in missing_res.fetchall()]

        if not missing_ids:
            return {"indexed": 0, "total_pending": 0}

        # Fetch expense objects with category names
        stmt = (
            select(Expense, Category.name)
            .join(Category, Category.id == Expense.category_id, isouter=True)
            .where(Expense.id.in_(missing_ids))
        )
        res = await self.session.execute(stmt)

        count = 0
        for exp, cat_name in res.all():
            await self.index_expense(exp, category_name=cat_name)
            count += 1

        await self.session.commit()
        return {"indexed": count, "total_pending": len(missing_ids)}
