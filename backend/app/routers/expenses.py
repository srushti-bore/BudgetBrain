"""
BudgetBrain — Expenses Router (Multi-Tenant)

Endpoints under /api/v1/expenses (SRS §5.2).
Protected by JWT authentication; business logic delegated to ExpenseService.
"""

from datetime import date as dt_date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.expense import PaymentMode
from app.models.user import User
from app.schemas.common import DataResponse, PaginatedMeta, PaginatedResponse
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseFilters,
    ExpenseOut,
    ExpenseUpdate,
)
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get(
    "",
    response_model=PaginatedResponse[ExpenseOut],
    summary="List expenses with search, filter, and sort",
)
async def list_expenses(
    # Pagination
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    # Search
    search: str | None = Query(default=None, description="Search in title and notes"),
    # Filters
    category_id: str | None = Query(default=None),
    date_from: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    amount_min: float | None = Query(default=None, ge=0),
    amount_max: float | None = Query(default=None, ge=0),
    payment_mode: PaymentMode | None = Query(default=None),
    is_recurring: bool | None = Query(default=None),
    # Sort
    sort_by: str = Query(default="date", pattern="^(amount|date|category)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-11 to FR-16: List expenses for the authenticated user with search + filter + sort.
    """
    try:
        parsed_date_from = dt_date.fromisoformat(date_from) if date_from else None
        parsed_date_to = dt_date.fromisoformat(date_to) if date_to else None
    except ValueError:
        from app.exceptions import ValidationException
        raise ValidationException(
            "Invalid date format. Use YYYY-MM-DD.", field="date_from/date_to"
        )

    filters = ExpenseFilters(
        search=search,
        category_id=category_id,
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        payment_mode=payment_mode,
        is_recurring=is_recurring,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    service = ExpenseService(db)
    items, total = await service.list_expenses(
        user_id=current_user.id, filters=filters, page=page, page_size=page_size
    )
    return PaginatedResponse(
        data=items,
        meta=PaginatedMeta(page=page, page_size=page_size, total=total),
    )


@router.post(
    "",
    response_model=DataResponse[ExpenseOut],
    status_code=status.HTTP_201_CREATED,
    summary="Create an expense",
)
async def create_expense(
    body: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-2: Add a new expense for the authenticated user with anti-deficit protection.
    """
    service = ExpenseService(db)
    expense = await service.create_expense(body, user_id=current_user.id)
    return DataResponse(data=expense)


@router.get(
    "/{expense_id}",
    response_model=DataResponse[ExpenseOut],
    summary="Get an expense by ID",
)
async def get_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-3: Return a single expense belonging to the authenticated user."""
    service = ExpenseService(db)
    expense = await service.get_expense(expense_id, user_id=current_user.id)
    return DataResponse(data=expense)


@router.patch(
    "/{expense_id}",
    response_model=DataResponse[ExpenseOut],
    summary="Update an expense",
)
async def update_expense(
    expense_id: str,
    body: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-4: Update an existing expense belonging to the authenticated user."""
    service = ExpenseService(db)
    expense = await service.update_expense(
        expense_id, body, user_id=current_user.id
    )
    return DataResponse(data=expense)


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an expense",
)
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-5: Delete an expense belonging to the authenticated user."""
    service = ExpenseService(db)
    await service.delete_expense(expense_id, user_id=current_user.id)
