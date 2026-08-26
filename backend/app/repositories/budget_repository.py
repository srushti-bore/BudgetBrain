"""
BudgetBrain — Budget Repository

All database operations for the budgets table.
No business logic — that belongs in BudgetService.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget
from app.models.category import Category
from app.repositories.base import BaseRepository



class BudgetRepository(BaseRepository[Budget]):
    model = Budget

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_overall_budget(self, period_start: date) -> tuple[Budget, str | None] | None:
        """
        Return the overall monthly budget for a given period (category_id = NULL).
        """
        stmt = (
            select(Budget, Category.name.label("category_name"))
            .outerjoin(Category, Budget.category_id == Category.id)
            .where(Budget.category_id.is_(None), Budget.period_start == period_start)
        )
        res = await self.session.execute(stmt)
        row = res.first()
        return (row[0], row[1]) if row else None

    async def get_by_category_and_period(
        self, category_id: str | None, period_start: date
    ) -> Budget | None:
        """Return the budget for a specific category (or None for overall) and period."""
        if category_id is None:
            stmt = select(Budget).where(
                Budget.category_id.is_(None), Budget.period_start == period_start
            )
        else:
            stmt = select(Budget).where(
                Budget.category_id == category_id, Budget.period_start == period_start
            )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_for_period(self, period_start: date) -> list[tuple[Budget, str | None]]:
        """Return all budgets (overall + per-category) for a given period with category names."""
        stmt = (
            select(Budget, Category.name.label("category_name"))
            .outerjoin(Category, Budget.category_id == Category.id)
            .where(Budget.period_start == period_start)
            .order_by(Budget.category_id.nulls_first())
        )
        res = await self.session.execute(stmt)
        return [(r[0], r[1]) for r in res.all()]

