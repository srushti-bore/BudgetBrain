from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException

from app.repositories.category_repository import CategoryRepository
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
        """
        cat = await self.category_repo.get_by_id(data.category_id)
        if not cat:
            raise NotFoundException("Category", field="category_id")

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
        """
        exp = await self.repo.get_by_id(expense_id)
        if not exp:
            raise NotFoundException("Expense")

        update_kwargs = data.model_dump(exclude_unset=True)
        if "category_id" in update_kwargs and update_kwargs["category_id"] != exp.category_id:
            cat = await self.category_repo.get_by_id(update_kwargs["category_id"])
            if not cat:
                raise NotFoundException("Category", field="category_id")

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

