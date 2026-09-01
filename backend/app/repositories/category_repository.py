"""
BudgetBrain — Category Repository (Multi-Tenant)

All database operations for the categories table.
Scoped strictly by user_id for multi-tenant isolation.
"""

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import UNCATEGORIZED_NAME, Category
from app.models.expense import Expense
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    model = Category

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_id_and_user(self, category_id: str, user_id: str) -> Category | None:
        """Fetch a single category scoped to the tenant user."""
        stmt = select(Category).where(
            (Category.id == category_id) & (Category.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str, user_id: str) -> Category | None:
        """Fetch a category by name case-insensitively for a specific user."""
        stmt = select(Category).where(
            (Category.user_id == user_id) & (func.lower(Category.name) == name.strip().lower())
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_with_expense_counts(
        self, user_id: str, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[tuple[Category, int]], int]:
        """
        List user categories with their linked expense counts.
        Returns ([(category, count), ...], total).
        """
        count_query = select(func.count()).select_from(Category).where(Category.user_id == user_id)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            select(Category, func.count(Expense.id).label("expense_count"))
            .outerjoin(
                Expense,
                (Category.id == Expense.category_id) & (Expense.user_id == user_id)
            )
            .where(Category.user_id == user_id)
            .group_by(Category.id)
            .order_by(Category.name.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        items = [(row[0], row[1]) for row in rows]
        return items, total

    async def count_linked_expenses(self, category_id: str, user_id: str) -> int:
        """Return the number of expenses linked to this category for the user."""
        result = await self.session.execute(
            select(func.count()).select_from(Expense).where(
                (Expense.category_id == category_id) & (Expense.user_id == user_id)
            )
        )
        return result.scalar_one()

    async def reassign_expenses_to_uncategorized(
        self, from_category_id: str, uncategorized_id: str, user_id: str
    ) -> None:
        """
        Reassign all expenses from a category to 'Uncategorized' for the user.
        Called as part of the safe category deletion flow (SRS §3.3).
        """
        stmt = (
            update(Expense)
            .where(
                (Expense.category_id == from_category_id) & (Expense.user_id == user_id)
            )
            .values(category_id=uncategorized_id)
        )
        await self.session.execute(stmt)

    async def get_uncategorized(self, user_id: str) -> Category | None:
        """Fetch the protected 'Uncategorized' system category for the user."""
        stmt = select(Category).where(
            (Category.user_id == user_id) & (Category.is_system == True)
        )
        result = await self.session.execute(stmt)
        cat = result.scalar_one_or_none()
        if not cat:
            cat = await self.get_by_name(UNCATEGORIZED_NAME, user_id)
        return cat
