"""
BudgetBrain — Dashboard Router (Multi-Tenant)

Endpoints under /api/v1/dashboard (SRS §5.2).
Protected by JWT authentication; aggregation logic delegated to DashboardService.
"""

from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.common import DataResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    summary="Dashboard summary — total spend, recent expenses, budget status",
)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-17, FR-18, FR-21: Return spend summary, recent expenses, and budget status for user.
    """
    service = DashboardService(db)
    result = await service.get_summary(user_id=current_user.id)
    return DataResponse(data=result)


@router.get(
    "/by-category",
    summary="Spend breakdown by category (pie/donut chart data)",
)
async def get_by_category(
    date_from: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-19: Return spending grouped by category for user."""
    try:
        parsed_from = date.fromisoformat(date_from) if date_from else None
        parsed_to = date.fromisoformat(date_to) if date_to else None
    except ValueError:
        from app.exceptions import ValidationException
        raise ValidationException(
            "Invalid date format. Use YYYY-MM-DD.", field="date_from/date_to"
        )
    service = DashboardService(db)
    result = await service.get_by_category(
        user_id=current_user.id,
        date_from=parsed_from,
        date_to=parsed_to,
    )
    return DataResponse(data=result)


@router.get(
    "/trend",
    summary="Spend over time (bar/line chart data)",
)
async def get_trend(
    group_by: str = Query(
        default="day",
        pattern="^(day|week|month)$",
        description="Grouping: day | week | month",
    ),
    date_from: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-20, FR-22: Return spend trend for user."""
    try:
        parsed_from = date.fromisoformat(date_from) if date_from else None
        parsed_to = date.fromisoformat(date_to) if date_to else None
    except ValueError:
        from app.exceptions import ValidationException
        raise ValidationException(
            "Invalid date format. Use YYYY-MM-DD.", field="date_from/date_to"
        )
    service = DashboardService(db)
    result = await service.get_trend(
        user_id=current_user.id,
        group_by=group_by,
        date_from=parsed_from,
        date_to=parsed_to,
    )
    return DataResponse(data=result)


@router.get(
    "/comparison",
    summary="Month-over-month spend comparison",
)
async def get_comparison(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-23: Return current vs previous month spend for user."""
    service = DashboardService(db)
    result = await service.get_comparison(user_id=current_user.id)
    return DataResponse(data=result)


@router.get(
    "/top-categories",
    summary="Top spending categories",
)
async def get_top_categories(
    limit: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FR-24: Return ranked top spending categories for user."""
    service = DashboardService(db)
    result = await service.get_top_categories(
        user_id=current_user.id, limit=limit
    )
    return DataResponse(data=result)
