"""
BudgetBrain — Dashboard Service

Business logic for all dashboard aggregation endpoints (FR-17 to FR-25).
Orchestrates data from ExpenseRepository and BudgetRepository.
"""

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.repositories.budget_repository import BudgetRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import ExpenseOut


settings = get_settings()


class DashboardService:
    """
    Handles all dashboard data assembly.
    Combines data from multiple repositories into dashboard-ready shapes.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.dashboard_repo = DashboardRepository(session)
        self.expense_repo = ExpenseRepository(session)
        self.budget_repo = BudgetRepository(session)

    def _current_month_range(self) -> tuple[date, date]:
        """Return (first_day, last_day) of the current month."""
        today = date.today()
        first_day = today.replace(day=1)
        last_day = today.replace(day=monthrange(today.year, today.month)[1])
        return first_day, last_day

    def _previous_month_range(self) -> tuple[date, date]:
        """Return (first_day, last_day) of the previous month."""
        today = date.today()
        first_day_this = today.replace(day=1)
        last_day_prev = first_day_this - timedelta(days=1)
        first_day_prev = last_day_prev.replace(day=1)
        return first_day_prev, last_day_prev

    async def get_summary(self) -> dict:
        """
        Assemble the dashboard summary (FR-17, FR-18, FR-21).
        """
        first_day, last_day = self._current_month_range()
        summary_data = await self.dashboard_repo.get_summary(
            period_start=first_day, period_end=last_day
        )
        recent_raw = await self.expense_repo.get_recent(limit=5)
        recent_expenses = [
            ExpenseOut(
                id=exp.id,
                title=exp.title,
                amount=exp.amount,
                category_id=exp.category_id,
                category_name=cat_name,
                date=exp.date,
                notes=exp.notes,
                payment_mode=exp.payment_mode,
                created_at=exp.created_at,
                updated_at=exp.updated_at,
            )
            for exp, cat_name in recent_raw
        ]

        overall_budget_tuple = await self.budget_repo.get_overall_budget(first_day)
        if overall_budget_tuple:
            budget_obj, _ = overall_budget_tuple
            limit_amt = budget_obj.limit_amount
            daily_limit = budget_obj.daily_limit
        else:
            limit_amt = Decimal("0.00")
            daily_limit = None

        total_spent = summary_data["total_spent"]
        remaining_amt = max(Decimal("0.00"), limit_amt - total_spent)

        if limit_amt > 0:
            pct = (total_spent / limit_amt) * 100
            if pct > 100:
                budget_status = "over_budget"
            elif pct >= settings.BUDGET_NEAR_LIMIT_THRESHOLD:
                budget_status = "near_limit"
            else:
                budget_status = "on_track"
        else:
            budget_status = "no_budget"

        today_spent = await self.expense_repo.get_total_spent(
            date_from=date.today(),
            date_to=date.today()
        )

        avg = await self.dashboard_repo.get_average_spend(date_from=first_day, date_to=last_day)

        return {
            "period_start": first_day,
            "period_end": last_day,
            "total_spent": total_spent,
            "expense_count": summary_data["expense_count"],
            "budget_limit": limit_amt,
            "budget_remaining": remaining_amt,
            "budget_status": budget_status,
            "recent_expenses": recent_expenses,
            "avg_daily_spend": avg["avg_daily"],
            "avg_weekly_spend": avg["avg_weekly"],
            "today_spent": today_spent,
            "daily_limit": daily_limit,
        }

    async def get_by_category(
        self, *, date_from: date | None = None, date_to: date | None = None
    ) -> list[dict]:
        """
        Return spend breakdown by category for pie/donut chart (FR-19).
        """
        first_day, last_day = self._current_month_range()
        return await self.expense_repo.get_spend_by_category(
            date_from=date_from or first_day,
            date_to=date_to or last_day,
        )

    async def get_trend(
        self,
        *,
        group_by: str = "day",
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict]:
        """
        Return spend over time for bar/line chart (FR-20, FR-22).
        """
        first_day, last_day = self._current_month_range()
        return await self.expense_repo.get_spend_trend(
            group_by=group_by,
            date_from=date_from or first_day,
            date_to=date_to or last_day,
        )

    async def get_comparison(self) -> dict:
        """
        Return month-over-month spend comparison with % change (FR-23).
        """
        curr_start, curr_end = self._current_month_range()
        prev_start, prev_end = self._previous_month_range()
        return await self.dashboard_repo.get_month_over_month(
            current_start=curr_start,
            current_end=curr_end,
            previous_start=prev_start,
            previous_end=prev_end,
        )

    async def get_top_categories(self, *, limit: int = 5) -> list[dict]:
        """
        Return top N categories by spend for current month (FR-24).
        """
        first_day, last_day = self._current_month_range()
        return await self.dashboard_repo.get_top_categories(
            date_from=first_day, date_to=last_day, limit=limit
        )

