import calendar
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BudgetExceededException, NotFoundException
from app.repositories.budget_repository import BudgetRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseFilters,
    ExpenseOut,
    ExpenseUpdate,
)


class ExpenseService:
    """
    Handles all business logic for expenses.
    Delegates DB access to ExpenseRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.repo = ExpenseRepository(session)
        self.category_repo = CategoryRepository(session)
        self.budget_repo = BudgetRepository(session)
        self.dashboard_repo = DashboardRepository(session)

    async def list_expenses(
        self,
        filters: ExpenseFilters,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ExpenseOut], int]:
        """
        Return paginated expenses with combined search + filter + sort (FR-11 to FR-16).
        """
        offset = (page - 1) * page_size
        raw_items, total = await self.repo.list_with_filters(
            filters, offset=offset, limit=page_size
        )
        items = [
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
            for exp, cat_name in raw_items
        ]
        return items, total

    async def get_expense(self, expense_id: str) -> ExpenseOut:
        """
        Return a single expense by ID.
        Raises NotFoundException if not found.
        """
        exp = await self.repo.get_by_id(expense_id)
        if not exp:
            raise NotFoundException("Expense")
        cat = await self.category_repo.get_by_id(exp.category_id)
        return ExpenseOut(
            id=exp.id,
            title=exp.title,
            amount=exp.amount,
            category_id=exp.category_id,
            category_name=cat.name if cat else None,
            date=exp.date,
            notes=exp.notes,
            payment_mode=exp.payment_mode,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
        )

    async def create_expense(self, data: ExpenseCreate) -> ExpenseOut:
        """
        Create a new expense.
        - Validates category exists → raises NotFoundException if not.
        - Strictly enforces active monthly budget cap → blocks transaction if budget is exceeded.
        """
        cat = await self.category_repo.get_by_id(data.category_id)
        if not cat:
            raise NotFoundException("Category", field="category_id")

        # Strict Budget Cap Enforcement: Check if expense exceeds monthly budget
        period_start = date(data.date.year, data.date.month, 1)
        budget_row = await self.budget_repo.get_overall_budget(period_start)
        if budget_row:
            budget, _ = budget_row
            budget_limit = Decimal(str(budget.limit_amount))
            _, last_day = calendar.monthrange(data.date.year, data.date.month)
            period_end = date(data.date.year, data.date.month, last_day)
            summary = await self.dashboard_repo.get_summary(
                period_start=period_start, period_end=period_end
            )
            current_spent = summary["total_spent"]
            if current_spent + data.amount > budget_limit:
                remaining = max(Decimal("0.00"), budget_limit - current_spent)
                raise BudgetExceededException(
                    expense_amount=data.amount,
                    remaining_budget=remaining,
                    budget_limit=budget_limit,
                )

        exp = await self.repo.create(
            title=data.title,
            amount=data.amount,
            category_id=data.category_id,
            date=data.date,
            notes=data.notes,
            payment_mode=data.payment_mode,
        )
        return ExpenseOut(
            id=exp.id,
            title=exp.title,
            amount=exp.amount,
            category_id=exp.category_id,
            category_name=cat.name,
            date=exp.date,
            notes=exp.notes,
            payment_mode=exp.payment_mode,
            is_recurring=exp.is_recurring,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
        )

    async def update_expense(self, expense_id: str, data: ExpenseUpdate) -> ExpenseOut:
        """
        Update any field on an existing expense (FR-4).
        - Strictly enforces active monthly budget cap on amount/date modification.
        """
        exp = await self.repo.get_by_id(expense_id)
        if not exp:
            raise NotFoundException("Expense")

        update_kwargs = data.model_dump(exclude_unset=True)
        if "category_id" in update_kwargs and update_kwargs["category_id"] != exp.category_id:
            cat = await self.category_repo.get_by_id(update_kwargs["category_id"])
            if not cat:
                raise NotFoundException("Category", field="category_id")

        target_date = data.date if data.date is not None else exp.date
        target_amount = data.amount if data.amount is not None else exp.amount

        # Strict Budget Cap Enforcement: Check if updated amount exceeds monthly budget
        period_start = date(target_date.year, target_date.month, 1)
        budget_row = await self.budget_repo.get_overall_budget(period_start)
        if budget_row:
            budget, _ = budget_row
            budget_limit = Decimal(str(budget.limit_amount))
            _, last_day = calendar.monthrange(target_date.year, target_date.month)
            period_end = date(target_date.year, target_date.month, last_day)
            summary = await self.dashboard_repo.get_summary(
                period_start=period_start, period_end=period_end
            )
            current_spent = summary["total_spent"]
            if exp.date.year == target_date.year and exp.date.month == target_date.month:
                projected_spent = current_spent - exp.amount + target_amount
                base_spent = current_spent - exp.amount
            else:
                projected_spent = current_spent + target_amount
                base_spent = current_spent

            if projected_spent > budget_limit:
                already_spent = max(Decimal("0.00"), base_spent)
                remaining = max(Decimal("0.00"), budget_limit - already_spent)
                raise BudgetExceededException(
                    expense_amount=target_amount,
                    remaining_budget=remaining,
                    budget_limit=budget_limit,
                )

        updated = await self.repo.update(exp, **update_kwargs)
        cat = await self.category_repo.get_by_id(updated.category_id)

        return ExpenseOut(
            id=updated.id,
            title=updated.title,
            amount=updated.amount,
            category_id=updated.category_id,
            category_name=cat.name if cat else None,
            date=updated.date,
            notes=updated.notes,
            payment_mode=updated.payment_mode,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )

    async def delete_expense(self, expense_id: str) -> None:
        """
        Delete an expense (FR-5).
        Raises NotFoundException if not found.
        """
        exp = await self.repo.get_by_id(expense_id)
        if not exp:
            raise NotFoundException("Expense")
        await self.repo.delete(exp)
