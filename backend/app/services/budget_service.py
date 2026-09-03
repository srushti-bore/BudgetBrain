import calendar
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.exceptions import ConflictException, NotFoundException
from app.models.budget import Budget
from app.repositories.budget_repository import BudgetRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetStatus, BudgetUpdate

settings = get_settings()


class BudgetService:
    """
    Handles all business logic for budgets with multi-tenant isolation.
    Delegates DB access to BudgetRepository and ExpenseRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
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
        self, budget: Budget, user_id: str, category_name: str | None = None
    ) -> BudgetOut:
        period_start = budget.period_start
        _, last_day = calendar.monthrange(period_start.year, period_start.month)
        period_end = date(period_start.year, period_start.month, last_day)

        spent = await self.expense_repo.get_total_spent(
            user_id=user_id,
            date_from=period_start,
            date_to=period_end,
            category_id=budget.category_id,
        )
        remaining = (budget.limit_amount - spent) if budget.limit_amount > 0 else Decimal("0.00")
        status = self._calculate_status(budget.limit_amount, spent)

        if category_name is None and budget.category_id:
            cat = await self.category_repo.get_by_id_and_user(budget.category_id, user_id)
            category_name = cat.name if cat else None

        return BudgetOut(
            id=budget.id,
            category_id=budget.category_id,
            category_name=category_name,
            period_type=budget.period_type,
            period_start=budget.period_start,
            limit_amount=budget.limit_amount,
            daily_limit=budget.daily_limit,
            spent_amount=spent,
            remaining_amount=remaining,
            status=status,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
        )

    async def list_budgets(
        self, user_id: str, *, period_start: date | None = None
    ) -> list[BudgetOut]:
        """
        Return all budgets for user for given period (defaults to current month).
        Each budget is enriched with live spent_amount, remaining_amount, and status.
        """
        if not period_start:
            today = date.today()
            period_start = date(today.year, today.month, 1)

        raw_budgets = await self.repo.list_for_period(user_id, period_start)
        return [
            await self._enrich_budget(b, user_id, cat_name) for b, cat_name in raw_budgets
        ]

    async def get_budget(self, budget_id: str, user_id: str) -> BudgetOut:
        """
        Return a single budget with live tracking fields for user.
        Raises NotFoundException if not found.
        """
        b = await self.repo.get_by_id_and_user(budget_id, user_id)
        if not b:
            raise NotFoundException("Budget")
        return await self._enrich_budget(b, user_id)

    async def create_budget(self, data: BudgetCreate, user_id: str) -> BudgetOut:
        """
        Create a new budget for user.
        - If category_id provided, validates category exists for user.
        - Checks uniqueness (category_id + period_start + user_id) → raises ConflictException if exists.
        """
        if data.category_id:
            cat = await self.category_repo.get_by_id_and_user(data.category_id, user_id)
            if not cat:
                raise NotFoundException("Category", field="category_id")

        existing = await self.repo.get_by_category_and_period(
            user_id=user_id,
            category_id=data.category_id,
            period_start=data.period_start,
        )
        if existing:
            updated = await self.repo.update(
                existing,
                limit_amount=data.limit_amount,
                daily_limit=data.daily_limit,
            )
            await self.session.commit()
            return await self._enrich_budget(updated, user_id)

        budget = await self.repo.create(
            user_id=user_id,
            category_id=data.category_id,
            period_type=data.period_type,
            period_start=data.period_start,
            limit_amount=data.limit_amount,
            daily_limit=data.daily_limit,
        )
        await self.session.commit()
        return await self._enrich_budget(budget, user_id)

    async def update_budget(
        self, budget_id: str, data: BudgetUpdate, user_id: str
    ) -> BudgetOut:
        """
        Update the limit_amount or daily_limit of an existing user budget.
        Raises NotFoundException if not found.
        """
        b = await self.repo.get_by_id_and_user(budget_id, user_id)
        if not b:
            raise NotFoundException("Budget")

        update_kwargs = data.model_dump(exclude_unset=True)
        updated = await self.repo.update(b, **update_kwargs)
        await self.session.commit()
        return await self._enrich_budget(updated, user_id)
