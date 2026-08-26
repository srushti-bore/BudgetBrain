import calendar
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.exceptions import NotFoundException
from app.models.budget import Budget
from app.repositories.budget_repository import BudgetRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetStatus, BudgetUpdate

settings = get_settings()


class BudgetService:
    """
    Handles all business logic for budgets.
    Delegates DB access to BudgetRepository and ExpenseRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.repo = BudgetRepository(session)
        self.expense_repo = ExpenseRepository(session)
        self.category_repo = CategoryRepository(session)

    def _calculate_status(self, limit: Decimal, spent: Decimal) -> str:
        """
        Calculate budget status based on configurable threshold (SRS §3.6).
        """
        if limit <= 0:
            return BudgetStatus.ON_TRACK
        pct = (spent / limit) * 100
        if pct > 100:
            return BudgetStatus.OVER_BUDGET
        if pct >= settings.BUDGET_NEAR_LIMIT_THRESHOLD:
            return BudgetStatus.NEAR_LIMIT
        return BudgetStatus.ON_TRACK

    async def _enrich_budget(
        self, budget: Budget, category_name: str | None = None
    ) -> BudgetOut:
        period_start = budget.period_start
        _, last_day = calendar.monthrange(period_start.year, period_start.month)
        period_end = date(period_start.year, period_start.month, last_day)

        spent = await self.expense_repo.get_total_spent(
            date_from=period_start,
            date_to=period_end,
            category_id=budget.category_id,
        )
        remaining = max(Decimal("0.00"), budget.limit_amount - spent)
        status = self._calculate_status(budget.limit_amount, spent)

        if category_name is None and budget.category_id:
            cat = await self.category_repo.get_by_id(budget.category_id)
            category_name = cat.name if cat else None

        return BudgetOut(
            id=budget.id,
            category_id=budget.category_id,
            category_name=category_name,
            period_type=budget.period_type,
            period_start=budget.period_start,
            limit_amount=budget.limit_amount,
            spent_amount=spent,
            remaining_amount=remaining,
            status=status,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
        )

    async def list_budgets(
        self, *, period_start: date | None = None
    ) -> list[BudgetOut]:
        """
        Return all budgets for the given period (defaults to current month).
        Each budget is enriched with live spent_amount, remaining_amount, and status.
        """
        if not period_start:
            today = date.today()
            period_start = date(today.year, today.month, 1)

        raw_budgets = await self.repo.list_for_period(period_start)
        return [
            await self._enrich_budget(b, cat_name) for b, cat_name in raw_budgets
        ]

    async def get_budget(self, budget_id: str) -> BudgetOut:
        """
        Return a single budget with live tracking fields.
        Raises NotFoundException if not found.
        """
        b = await self.repo.get_by_id(budget_id)
        if not b:
            raise NotFoundException("Budget")
        return await self._enrich_budget(b)

    async def create_budget(self, data: BudgetCreate) -> BudgetOut:
        """
        Create or update a budget goal (Seamless Upsert).
        - One overall budget per period (category_id = None).
        - One per-category budget per period.
        """
        today = date.today()
        period_start = data.period_start or date(today.year, today.month, 1)

        existing = await self.repo.get_by_category_and_period(
            data.category_id, period_start
        )
        if existing:
            updated = await self.repo.update(existing, limit_amount=data.limit_amount)
            return await self._enrich_budget(updated)

        if data.category_id:
            cat = await self.category_repo.get_by_id(data.category_id)
            if not cat:
                raise NotFoundException("Category", field="category_id")

        created = await self.repo.create(
            category_id=data.category_id,
            period_type=data.period_type,
            period_start=period_start,
            limit_amount=data.limit_amount,
        )
        return await self._enrich_budget(created)

    async def update_budget(self, budget_id: str, data: BudgetUpdate) -> BudgetOut:
        """
        Update the limit_amount of an existing budget.
        Raises NotFoundException if not found.
        """
        b = await self.repo.get_by_id(budget_id)
        if not b:
            raise NotFoundException("Budget")

        updated = await self.repo.update(b, limit_amount=data.limit_amount)
        return await self._enrich_budget(updated)
