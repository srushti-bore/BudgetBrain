"""
BudgetBrain — Dashboard Repository

Aggregation queries for dashboard endpoints.
No business logic — that belongs in DashboardService.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.expense import Expense



class DashboardRepository:
    """
    Dedicated repository for dashboard aggregation queries.
    These are read-only, reporting-style queries.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_summary(self, *, period_start: date, period_end: date) -> dict:
        """
        Return total spend and count for the given period.
        """
        stmt = (
            select(
                func.coalesce(func.sum(Expense.amount), 0),
                func.count(Expense.id),
            )
            .select_from(Expense)
            .where(Expense.date >= period_start, Expense.date <= period_end)
        )
        res = await self.session.execute(stmt)
        row = res.first()
        return {
            "total_spent": Decimal(str(row[0])),
            "expense_count": row[1],
        }

    async def get_month_over_month(
        self, *, current_start: date, current_end: date, previous_start: date, previous_end: date
    ) -> dict:
        """
        Compare spend between current and previous month.
        """
        stmt_curr = (
            select(func.coalesce(func.sum(Expense.amount), 0))
            .select_from(Expense)
            .where(Expense.date >= current_start, Expense.date <= current_end)
        )
        stmt_prev = (
            select(func.coalesce(func.sum(Expense.amount), 0))
            .select_from(Expense)
            .where(Expense.date >= previous_start, Expense.date <= previous_end)
        )

        res_curr = await self.session.execute(stmt_curr)
        res_prev = await self.session.execute(stmt_prev)

        curr_total = Decimal(str(res_curr.scalar_one()))
        prev_total = Decimal(str(res_prev.scalar_one()))

        diff = curr_total - prev_total
        pct_change = float((diff / prev_total) * 100) if prev_total > 0 else (100.0 if curr_total > 0 else 0.0)

        return {
            "current_month_total": curr_total,
            "previous_month_total": prev_total,
            "difference": diff,
            "percentage_change": round(pct_change, 2),
        }

    async def get_top_categories(
        self, *, date_from: date, date_to: date, limit: int = 5
    ) -> list[dict]:
        """
        Return categories ranked by total spend.
        """
        stmt = (
            select(
                Expense.category_id,
                Category.name.label("category_name"),
                func.sum(Expense.amount).label("total"),
            )
            .join(Category, Expense.category_id == Category.id)
            .where(Expense.date >= date_from, Expense.date <= date_to)
            .group_by(Expense.category_id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        rows = res.all()
        return [
            {
                "rank": idx + 1,
                "category_id": r[0],
                "category_name": r[1],
                "total_spent": Decimal(str(r[2])),
            }
            for idx, r in enumerate(rows)
        ]

    async def get_average_spend(
        self, *, date_from: date, date_to: date
    ) -> dict:
        """
        Return average spend per day/week.
        Uses elapsed days (up to today) instead of full period to avoid
        deflating the average when queried mid-month.
        """
        stmt = (
            select(func.coalesce(func.sum(Expense.amount), 0))
            .select_from(Expense)
            .where(Expense.date >= date_from, Expense.date <= date_to)
        )
        res = await self.session.execute(stmt)
        total = Decimal(str(res.scalar_one()))

        # Use elapsed days (up to today), not full period
        effective_end = min(date_to, date.today())
        num_days = max(1, (effective_end - date_from).days + 1)
        avg_daily = round(total / Decimal(num_days), 2)
        avg_weekly = round(avg_daily * Decimal(7), 2)

        return {
            "avg_daily": avg_daily,
            "avg_weekly": avg_weekly,
        }

