"""
BudgetBrain — Budgets Router (Multi-Tenant)

Endpoints under /api/v1/budgets (SRS §5.2).
Protected by JWT authentication; business logic delegated to BudgetService.
"""

from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.schemas.common import DataResponse, PaginatedMeta, PaginatedResponse
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get(
    "",
    response_model=PaginatedResponse[BudgetOut],
    summary="List budgets for a period",
)
async def list_budgets(
    period_start: str | None = Query(
        default=None,
        description="Period start date (YYYY-MM-DD). Defaults to first day of current month.",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-26: Return all budgets for the authenticated user with live tracking.
    """
    try:
        parsed_date = date.fromisoformat(period_start) if period_start else None
    except ValueError:
        from app.exceptions import ValidationException
        raise ValidationException(
            "Invalid date format. Use YYYY-MM-DD.", field="period_start"
        )
    service = BudgetService(db)
    items = await service.list_budgets(
        user_id=current_user.id, period_start=parsed_date
    )
    return PaginatedResponse(
        data=items,
        meta=PaginatedMeta(page=1, page_size=len(items), total=len(items)),
    )


@router.post(
    "",
    response_model=DataResponse[BudgetOut],
    status_code=status.HTTP_201_CREATED,
    summary="Create a budget goal",
)
async def create_budget(
    body: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-26: Set an overall or per-category monthly budget goal for authenticated user.
    """
    service = BudgetService(db)
    budget = await service.create_budget(body, user_id=current_user.id)
    return DataResponse(data=budget)


@router.get(
    "/{budget_id}",
    response_model=DataResponse[BudgetOut],
    summary="Get a budget by ID",
)
async def get_budget(
    budget_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a single budget belonging to the authenticated user."""
    service = BudgetService(db)
    budget = await service.get_budget(budget_id, user_id=current_user.id)
    return DataResponse(data=budget)


@router.patch(
    "/{budget_id}",
    response_model=DataResponse[BudgetOut],
    summary="Update a budget limit",
)
async def update_budget(
    budget_id: str,
    body: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-26: Update the limit of an existing budget belonging to user."""
    service = BudgetService(db)
    budget = await service.update_budget(
        budget_id, body, user_id=current_user.id
    )
    return DataResponse(data=budget)
