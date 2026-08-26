"""
BudgetBrain — Dashboard Router

Endpoints under /api/v1/dashboard (SRS §5.2).
All data assembly is delegated to DashboardService.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    summary="Dashboard summary — total spend, recent expenses, budget status",
)
async def get_summary(db: AsyncSession = Depends(get_db)):
    """
    FR-17, FR-18, FR-21: Return:
      - total_spent (overall + current month)
      - recent_expenses (last 5)
      - budget_status (overall monthly budget)
    """
    service = DashboardService(db)
    return await service.get_summary()


@router.get(
    "/by-category",
    summary="Spend breakdown by category (pie/donut chart data)",
)
async def get_by_category(
    date_from: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-19: Return spending grouped by category.
    Default: current month.
    """
    service = DashboardService(db)
    return await service.get_by_category(
        date_from=date.fromisoformat(date_from) if date_from else None,
        date_to=date.fromisoformat(date_to) if date_to else None,
    )


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
    db: AsyncSession = Depends(get_db),
):
    """
    FR-20, FR-22: Return spend grouped by day/week/month for trend chart.
    """
    service = DashboardService(db)
    return await service.get_trend(
        group_by=group_by,
        date_from=date.fromisoformat(date_from) if date_from else None,
        date_to=date.fromisoformat(date_to) if date_to else None,
    )


@router.get(
    "/comparison",
    summary="Month-over-month spend comparison",
)
async def get_comparison(db: AsyncSession = Depends(get_db)):
    """
    FR-23: Return current month vs previous month spend with % change.
    """
    service = DashboardService(db)
    return await service.get_comparison()


@router.get(
    "/top-categories",
    summary="Top spending categories",
)
async def get_top_categories(
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-24: Return top N categories by spend for the current month.
    """
    service = DashboardService(db)
    return await service.get_top_categories(limit=limit)
