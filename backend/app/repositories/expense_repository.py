"""
BudgetBrain — Expense Repository

All database operations for the expenses table.
No business logic — that belongs in ExpenseService.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.expense import Expense
from app.repositories.base import BaseRepository
from app.schemas.expense import ExpenseFilters


class ExpenseRepository(BaseRepository[Expense]):
    model = Expense

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def list_with_filters(
        self,
        filters: ExpenseFilters,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[tuple[Expense, str | None]], int]:
        """
        List expenses with combined search + filter + sort (SRS §3.4).
        Returns ([(expense, category_name), ...], total).
        """
        conditions = []

        if filters.search:
            pattern = f"%{filters.search.strip()}%"
            conditions.append(
                (Expense.title.ilike(pattern)) | (Expense.notes.ilike(pattern))
            )
        if filters.category_id:
            conditions.append(Expense.category_id == filters.category_id)
        if filters.date_from:
            conditions.append(Expense.date >= filters.date_from)
        if filters.date_to:
            conditions.append(Expense.date <= filters.date_to)
        if filters.amount_min is not None:
            conditions.append(Expense.amount >= filters.amount_min)
        if filters.amount_max is not None:
            conditions.append(Expense.amount <= filters.amount_max)
        if filters.payment_mode:
            conditions.append(Expense.payment_mode == filters.payment_mode)
        if filters.is_recurring is not None:
            conditions.append(Expense.is_recurring == filters.is_recurring)

        # Count total matching rows
        count_stmt = select(func.count()).select_from(Expense)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        # Main query with Category join
        stmt = select(Expense, Category.name.label("category_name")).outerjoin(
            Category, Expense.category_id == Category.id
        )
        if conditions:
            stmt = stmt.where(*conditions)

        # Sorting
        sort_col = Expense.date
        if filters.sort_by == "amount":
            sort_col = Expense.amount
        elif filters.sort_by == "category":
            sort_col = Category.name

        if filters.sort_order == "asc":
            stmt = stmt.order_by(sort_col.asc(), Expense.created_at.asc())
        else:
            stmt = stmt.order_by(sort_col.desc(), Expense.created_at.desc())

        stmt = stmt.offset(offset).limit(limit)
        res = await self.session.execute(stmt)
        rows = res.all()
        items = [(row[0], row[1]) for row in rows]
        return items, total

    async def get_total_spent(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: str | None = None,
    ) -> Decimal:
        """
        Return the sum of all expense amounts within optional date/category bounds.
        """
        stmt = select(func.coalesce(func.sum(Expense.amount), 0)).select_from(Expense)
        if date_from:
            stmt = stmt.where(Expense.date >= date_from)
        if date_to:
            stmt = stmt.where(Expense.date <= date_to)
        if category_id:
            stmt = stmt.where(Expense.category_id == category_id)

        res = await self.session.execute(stmt)
        val = res.scalar_one()
        return Decimal(str(val))

    async def get_spend_by_category(
        self, *, date_from: date | None = None, date_to: date | None = None
    ) -> list[dict]:
        """
        Return total spend grouped by category (pie/donut chart).
        """
        stmt = (
            select(
                Expense.category_id,
                Category.name.label("category_name"),
                func.sum(Expense.amount).label("total"),
            )
            .join(Category, Expense.category_id == Category.id)
            .group_by(Expense.category_id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
        )
        if date_from:
            stmt = stmt.where(Expense.date >= date_from)
        if date_to:
            stmt = stmt.where(Expense.date <= date_to)

        res = await self.session.execute(stmt)
        rows = res.all()
        return [
            {
                "category_id": r[0],
                "category_name": r[1],
                "total": Decimal(str(r[2])),
            }
            for r in rows
        ]

    async def get_spend_trend(
        self,
        *,
        group_by: str = "day",
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict]:
        """
        Return spend grouped by time period (day | week | month).
        """
        trunc = func.date_trunc(group_by, Expense.date).label("period")
        stmt = (
            select(trunc, func.sum(Expense.amount).label("total"))
            .group_by(trunc)
            .order_by(trunc.asc())
        )
        if date_from:
            stmt = stmt.where(Expense.date >= date_from)
        if date_to:
            stmt = stmt.where(Expense.date <= date_to)

        res = await self.session.execute(stmt)
        rows = res.all()
        return [
            {
                "period": r[0].strftime("%Y-%m-%d") if hasattr(r[0], "strftime") else str(r[0]),
                "total": Decimal(str(r[1])),
            }
            for r in rows
        ]

    async def get_recent(self, *, limit: int = 5) -> list[tuple[Expense, str | None]]:
        """Return the most recent N expenses with category names."""
        stmt = (
            select(Expense, Category.name.label("category_name"))
            .outerjoin(Category, Expense.category_id == Category.id)
            .order_by(Expense.date.desc(), Expense.created_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return [(r[0], r[1]) for r in res.all()]

