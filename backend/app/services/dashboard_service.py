"""
BudgetBrain — Dashboard Service (Multi-Tenant)

Business logic for all dashboard aggregation endpoints (FR-17 to FR-25).
Orchestrates multi-tenant data from ExpenseRepository and BudgetRepository.
"""

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.category import Category
from app.models.expense import Expense
from app.repositories.budget_repository import BudgetRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.emotional_spending import (
    EmotionalAIAdvice,
    EmotionalSpendingResponse,
    ImpulsePattern,
    MoodSummary,
)
from app.schemas.expense import ExpenseOut
from app.services.ai.factory import get_ai_provider

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
        remaining_amt = (limit_amt - total_spent) if limit_amt > 0 else Decimal("0.00")

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

    async def get_emotional_spending(
        self,
        user_id: str,
        user_name: str,
        currency_symbol: str = "₹",
    ) -> EmotionalSpendingResponse:
        """
        Emotion-Aware Spending Analytics & Impulse Pattern Detection.
        Aggregates spending by mood, determines category correlations, flags impulse buys,
        and invokes active AI provider for psychological spending advice.
        """
        curr_start, curr_end = self._current_month_range()

        # 1. Fetch all expenses with category name in current month
        stmt = (
            select(Expense, Category.name.label("category_name"))
            .outerjoin(Category, Expense.category_id == Category.id)
            .where(
                (Expense.user_id == user_id)
                & (Expense.date >= curr_start)
                & (Expense.date <= curr_end)
            )
        )
        res = await self.dashboard_repo.session.execute(stmt)
        rows = res.all()

        total_tracked_amount = 0.0
        all_amounts: list[float] = []

        # Data structures for moods
        VALID_MOODS = ["happy", "normal", "sad", "stressed", "excited"]
        mood_totals = {m: 0.0 for m in VALID_MOODS}
        mood_counts = {m: 0 for m in VALID_MOODS}
        mood_categories = {m: {} for m in VALID_MOODS}

        # Impulse tracking: high emotion tags (stressed, sad, excited) with unusually high amounts
        impulse_txs = []

        for exp, cat_name in rows:
            amt = float(exp.amount)
            all_amounts.append(amt)
            c_name = cat_name or "General"

            if exp.mood and exp.mood.lower() in VALID_MOODS:
                m = exp.mood.lower()
                mood_totals[m] += amt
                mood_counts[m] += 1
                mood_categories[m][c_name] = mood_categories[m].get(c_name, 0.0) + amt
                total_tracked_amount += amt

        # Baseline average transaction
        avg_tx = (sum(all_amounts) / len(all_amounts)) if all_amounts else 0.0
        impulse_threshold = max(500.0, avg_tx * 1.3)

        # Detect impulse transactions
        trigger_moods_set = set()
        total_impulse_amount = 0.0

        for exp, cat_name in rows:
            amt = float(exp.amount)
            if exp.mood and exp.mood.lower() in ["stressed", "sad", "excited"]:
                if amt >= impulse_threshold:
                    impulse_txs.append(exp)
                    total_impulse_amount += amt
                    trigger_moods_set.add(exp.mood.lower())

        impulse_percentage = (
            round((total_impulse_amount / total_tracked_amount) * 100, 1)
            if total_tracked_amount > 0
            else 0.0
        )

        impulse_pattern = ImpulsePattern(
            total_impulse_amount=round(total_impulse_amount, 2),
            impulse_percentage=impulse_percentage,
            flagged_transactions_count=len(impulse_txs),
            trigger_moods=list(trigger_moods_set),
        )

        # Build MoodSummary objects
        mood_summaries: list[MoodSummary] = []
        dominant_triggers = []

        for m in VALID_MOODS:
            m_amt = mood_totals[m]
            m_cnt = mood_counts[m]
            pct = round((m_amt / total_tracked_amount) * 100, 1) if total_tracked_amount > 0 else 0.0

            # Find dominant category for this mood
            cats_for_mood = mood_categories[m]
            dom_cat = (
                max(cats_for_mood.items(), key=lambda x: x[1])[0]
                if cats_for_mood
                else None
            )

            mood_summaries.append(
                MoodSummary(
                    mood=m,
                    total_amount=round(m_amt, 2),
                    count=m_cnt,
                    percentage=pct,
                    dominant_category=dom_cat,
                )
            )

            if dom_cat and m in ["stressed", "excited", "sad"]:
                dominant_triggers.append({"mood": m, "category": dom_cat, "amount": m_amt})

        # Delegate to active AI provider for psychological insights
        provider = get_ai_provider(settings)
        mood_dicts = [ms.model_dump() for ms in mood_summaries]
        impulse_dict = impulse_pattern.model_dump()

        ai_insights = await provider.generate_emotional_insights(
            user_name=user_name,
            currency_symbol=currency_symbol,
            mood_breakdown=mood_dicts,
            impulse_data=impulse_dict,
            dominant_triggers=dominant_triggers,
        )

        return EmotionalSpendingResponse(
            period_start=curr_start.isoformat(),
            period_end=curr_end.isoformat(),
            total_tracked_amount=round(total_tracked_amount, 2),
            mood_breakdown=mood_summaries,
            impulse_patterns=impulse_pattern,
            ai_insights=ai_insights,
            provider=provider.provider_name,
            model=provider.model_name,
        )

