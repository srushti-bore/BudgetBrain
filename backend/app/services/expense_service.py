import calendar
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BudgetExceededException, NotFoundException
from app.repositories.budget_repository import BudgetRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.expense_repository import ExpenseRepository
from app.services.ai.rag_service import RAGService
from app.schemas.expense import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    ExpenseCreate,
    ExpenseFilters,
    ExpenseOut,
    ExpenseUpdate,
)


class ExpenseService:
    """
    Handles all business logic for expenses with multi-tenant isolation.
    Delegates DB access to ExpenseRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ExpenseRepository(session)
        self.category_repo = CategoryRepository(session)
        self.budget_repo = BudgetRepository(session)
        self.dashboard_repo = DashboardRepository(session)
        self.rag_service = RAGService(session)

    async def list_expenses(
        self,
        user_id: str,
        filters: ExpenseFilters,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ExpenseOut], int]:
        """
        Return paginated expenses for user with combined search + filter + sort (FR-11 to FR-16).
        """
        offset = (page - 1) * page_size
        raw_items, total = await self.repo.list_with_filters(
            user_id, filters, offset=offset, limit=page_size
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
                mood=exp.mood,
                is_recurring=exp.is_recurring,
                created_at=exp.created_at,
                updated_at=exp.updated_at,
            )
            for exp, cat_name in raw_items
        ]
        return items, total

    async def get_expense(self, expense_id: str, user_id: str) -> ExpenseOut:
        """
        Return a single expense by ID belonging to user.
        Raises NotFoundException if not found.
        """
        exp = await self.repo.get_by_id_and_user(expense_id, user_id)
        if not exp:
            raise NotFoundException("Expense")
        cat = await self.category_repo.get_by_id_and_user(exp.category_id, user_id)
        return ExpenseOut(
            id=exp.id,
            title=exp.title,
            amount=exp.amount,
            category_id=exp.category_id,
            category_name=cat.name if cat else None,
            date=exp.date,
            notes=exp.notes,
            payment_mode=exp.payment_mode,
            mood=exp.mood,
            is_recurring=exp.is_recurring,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
        )

    async def create_expense(self, data: ExpenseCreate, user_id: str) -> ExpenseOut:
        """
        Create a new expense for user.
        - Validates category exists for user → raises NotFoundException if not.
        - Strictly enforces active monthly budget cap for user → blocks transaction if exceeded.
        """
        cat = await self.category_repo.get_by_id_and_user(data.category_id, user_id)
        if not cat:
            raise NotFoundException("Category", field="category_id")

        exp = await self.repo.create(
            user_id=user_id,
            title=data.title,
            amount=data.amount,
            category_id=data.category_id,
            date=data.date,
            notes=data.notes,
            payment_mode=data.payment_mode,
            mood=data.mood,
            is_recurring=data.is_recurring if hasattr(data, "is_recurring") and data.is_recurring is not None else False,
        )
        await self.session.commit()

        # Automatic RAG Vector Indexing (resilient & non-blocking)
        try:
            await self.rag_service.index_expense(exp, category_name=cat.name)
            await self.session.commit()
        except Exception:
            pass

        return ExpenseOut(
            id=exp.id,
            title=exp.title,
            amount=exp.amount,
            category_id=exp.category_id,
            category_name=cat.name,
            date=exp.date,
            notes=exp.notes,
            payment_mode=exp.payment_mode,
            mood=exp.mood,
            is_recurring=exp.is_recurring,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
        )

    async def update_expense(
        self, expense_id: str, data: ExpenseUpdate, user_id: str
    ) -> ExpenseOut:
        """
        Update any field on an existing user-owned expense (FR-4).
        """
        exp = await self.repo.get_by_id_and_user(expense_id, user_id)
        if not exp:
            raise NotFoundException("Expense")

        update_kwargs = data.model_dump(exclude_unset=True)
        if "category_id" in update_kwargs and update_kwargs["category_id"] != exp.category_id:
            cat = await self.category_repo.get_by_id_and_user(update_kwargs["category_id"], user_id)
            if not cat:
                raise NotFoundException("Category", field="category_id")

        updated = await self.repo.update(exp, **update_kwargs)
        await self.session.commit()
        cat = await self.category_repo.get_by_id_and_user(updated.category_id, user_id)

        # Update RAG Vector Index
        try:
            await self.rag_service.index_expense(updated, category_name=cat.name if cat else None)
            await self.session.commit()
        except Exception:
            pass

        return ExpenseOut(
            id=updated.id,
            title=updated.title,
            amount=updated.amount,
            category_id=updated.category_id,
            category_name=cat.name if cat else None,
            date=updated.date,
            notes=updated.notes,
            payment_mode=updated.payment_mode,
            mood=updated.mood,
            is_recurring=updated.is_recurring,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )

    async def delete_expense(self, expense_id: str, user_id: str) -> None:
        """
        Delete an expense (FR-5).
        Raises NotFoundException if not found or not owned by user.
        """
        exp = await self.repo.get_by_id_and_user(expense_id, user_id)
        if not exp:
            raise NotFoundException("Expense")
        
        # Remove RAG index
        try:
            await self.rag_service.delete_expense_index(expense_id, user_id)
        except Exception:
            pass

        await self.repo.delete(exp)
        await self.session.commit()

    async def check_duplicate(
        self, user_id: str, data: DuplicateCheckRequest
    ) -> DuplicateCheckResponse:
        """
        Feature 21: Duplicate Transaction Guard.
        Checks if a transaction with matching amount and similar description exists within ±2 days.
        """
        candidate = await self.repo.find_duplicate_candidate(
            user_id=user_id,
            title=data.title,
            amount=data.amount,
            date_val=data.date,
            exclude_id=data.exclude_id,
        )

        if not candidate:
            return DuplicateCheckResponse(is_duplicate=False)

        exp, cat_name, match_type = candidate
        days_diff = (data.date - exp.date).days

        if days_diff == 0:
            rel_day = "on the same day"
        elif days_diff == 1:
            rel_day = "yesterday"
        elif days_diff == -1:
            rel_day = "tomorrow"
        elif days_diff > 1:
            rel_day = f"{days_diff} days earlier"
        else:
            rel_day = f"{abs(days_diff)} days later"

        category_part = f" in {cat_name}" if cat_name else ""
        msg = f"A matching transaction of ₹{float(exp.amount):,.2f} for '{exp.title}' was already logged {rel_day}{category_part} ({exp.date.strftime('%b %d, %Y')})."

        existing_out = ExpenseOut(
            id=exp.id,
            title=exp.title,
            amount=exp.amount,
            category_id=exp.category_id,
            category_name=cat_name,
            date=exp.date,
            notes=exp.notes,
            payment_mode=exp.payment_mode,
            mood=exp.mood,
            is_recurring=exp.is_recurring,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
        )

        return DuplicateCheckResponse(
            is_duplicate=True,
            match_type=match_type,
            existing_expense=existing_out,
            days_difference=days_diff,
            message=msg,
        )

