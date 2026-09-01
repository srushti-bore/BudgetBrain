"""
BudgetBrain — Dashboard Service (Multi-Tenant)

Business logic for all dashboard aggregation endpoints (FR-17 to FR-25).
Orchestrates multi-tenant data from ExpenseRepository and BudgetRepository.
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
    Handles all dashboard data assembly for authenticated users.
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

    async def get_summary(self, user_id: str) -> dict:
        """
        Assemble the dashboard summary (FR-17, FR-18, FR-21) for user.
        """
        first_day, last_day = self._current_month_range()
        summary_data = await self.dashboard_repo.get_summary(
            user_id, period_start=first_day, period_end=last_day
        )
        recent_raw = await self.expense_repo.get_recent(user_id, limit=5)
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
                is_recurring=exp.is_recurring,
                created_at=exp.created_at,
                updated_at=exp.updated_at,
            )
            for exp, cat_name in recent_raw
        ]

        overall_budget_tuple = await self.budget_repo.get_overall_budget(user_id, first_day)
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
            user_id,
            date_from=date.today(),
            date_to=date.today(),
        )

        today_obj = date.today()
        elapsed_days = max(1, today_obj.day)
        avg_daily_spent = round(total_spent / elapsed_days, 2)

        return {
            "total_spent": total_spent,
            "today_spent": today_spent,
            "average_daily_spent": avg_daily_spent,
            "expense_count": summary_data["expense_count"],
            "period_start": first_day.isoformat(),
            "period_end": last_day.isoformat(),
            "budget": {
                "limit_amount": limit_amt,
                "daily_limit": daily_limit,
                "spent_amount": total_spent,
                "remaining_amount": remaining_amt,
                "status": budget_status,
            },
            "recent_expenses": [e.model_dump() for e in recent_expenses],
        }

    async def get_by_category(
        self,
        user_id: str,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict]:
        """Spend breakdown by category for pie/donut chart (FR-19) for user."""
        if not date_from and not date_to:
            date_from, date_to = self._current_month_range()
        return await self.expense_repo.get_spend_by_category(
            user_id, date_from=date_from, date_to=date_to
        )

    async def get_trend(
        self,
        user_id: str,
        *,
        group_by: str = "day",
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict]:
        """Spend trend over time for bar/line chart (FR-20) for user."""
        if not date_from and not date_to:
            if group_by == "month":
                today = date.today()
                date_from = today.replace(month=1, day=1)
                date_to = today
            else:
                date_from, date_to = self._current_month_range()
        return await self.expense_repo.get_spend_trend(
            user_id, group_by=group_by, date_from=date_from, date_to=date_to
        )

    async def get_comparison(self, user_id: str) -> dict:
        """Month-over-month spend comparison (FR-23) for user."""
        curr_start, curr_end = self._current_month_range()
        prev_start, prev_end = self._previous_month_range()
        raw = await self.dashboard_repo.get_month_over_month(
            user_id,
            current_start=curr_start,
            current_end=curr_end,
            previous_start=prev_start,
            previous_end=prev_end,
        )
        return {
            "current_month_total": raw["current_month_total"],
            "current_month_spent": raw["current_month_total"],
            "previous_month_total": raw["previous_month_total"],
            "previous_month_spent": raw["previous_month_total"],
            "difference": raw["difference"],
            "percentage_change": raw["percentage_change"],
            "is_increase": raw["difference"] > 0,
            "current_period": {"start": curr_start.isoformat(), "end": curr_end.isoformat()},
            "previous_period": {"start": prev_start.isoformat(), "end": prev_end.isoformat()},
        }

    async def get_top_categories(self, user_id: str, *, limit: int = 5) -> list[dict]:
        """Top spending categories for current month (FR-24) for user."""
        curr_start, curr_end = self._current_month_range()
        return await self.dashboard_repo.get_top_categories(
            user_id, date_from=curr_start, date_to=curr_end, limit=limit
        )
