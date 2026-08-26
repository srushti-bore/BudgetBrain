"""
BudgetBrain — Category Repository

All database operations for the categories table.
No business logic — that belongs in CategoryService.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.expense import Expense
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    model = Category

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_name(self, name: str) -> Category | None:
        """Fetch a category by exact name (case-sensitive)."""
        result = await self.session.execute(
            select(Category).where(Category.name == name)
        )
        return result.scalar_one_or_none()

    async def list_with_expense_counts(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[tuple[Category, int]], int]:
        """
        List categories with their linked expense counts.
        Returns ([(category, count), ...], total).
        Used for FR-9.
        """
        count_query = select(func.count()).select_from(Category)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            select(Category, func.count(Expense.id).label("expense_count"))
            .outerjoin(Expense, Category.id == Expense.category_id)
            .group_by(Category.id)
            .order_by(Category.name.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        items = [(row[0], row[1]) for row in rows]
        return items, total

    async def count_linked_expenses(self, category_id: str) -> int:
        """Return the number of expenses linked to this category."""
        result = await self.session.execute(
            select(func.count()).select_from(Expense).where(
                Expense.category_id == category_id
            )
        )
        return result.scalar_one()

    async def reassign_expenses_to_uncategorized(
        self, from_category_id: str, uncategorized_id: str
    ) -> None:
        """
        Reassign all expenses from a category to 'Uncategorized'.
        Called as part of the safe category deletion flow (SRS §3.3).
        Must be called inside a transaction.
        """
        from sqlalchemy import update
        stmt = (
            update(Expense)
            .where(Expense.category_id == from_category_id)
            .values(category_id=uncategorized_id)
        )
        await self.session.execute(stmt)

    async def get_uncategorized(self) -> Category | None:
        """Fetch the protected 'Uncategorized' system category."""
        return await self.get_by_name("Uncategorized")

