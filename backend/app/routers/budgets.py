"""
BudgetBrain — Budgets Router

Endpoints under /api/v1/budgets (SRS §5.2).
All business logic is delegated to BudgetService.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
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
    db: AsyncSession = Depends(get_db),
):
    """
    FR-26: Return all budgets (overall + per-category) with live tracking.
    Each budget includes: spent_amount, remaining_amount, status.
    """
    parsed_date = date.fromisoformat(period_start) if period_start else None
    service = BudgetService(db)
    items = await service.list_budgets(period_start=parsed_date)
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
    db: AsyncSession = Depends(get_db),
):
    """
    FR-26: Set an overall or per-category monthly budget goal.
    Returns 409 if a budget for the same category + period already exists.
    """
    service = BudgetService(db)
    budget = await service.create_budget(body)
    return DataResponse(data=budget)


@router.get(
    "/{budget_id}",
    response_model=DataResponse[BudgetOut],
    summary="Get a budget by ID",
)
async def get_budget(
    budget_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return a single budget with live tracking fields. Returns 404 if not found."""
    service = BudgetService(db)
    budget = await service.get_budget(budget_id)
    return DataResponse(data=budget)


@router.patch(
    "/{budget_id}",
    response_model=DataResponse[BudgetOut],
    summary="Update a budget limit",
)
async def update_budget(
    budget_id: str,
    body: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
):
    """FR-26: Update the limit_amount of an existing budget."""
    service = BudgetService(db)
    budget = await service.update_budget(budget_id, body)
    return DataResponse(data=budget)
