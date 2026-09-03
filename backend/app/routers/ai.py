"""
BudgetBrain — AI Recommendations Router (Multi-Tenant)

SRS §3.7 & §5.2:
  Exposes endpoints for Provider-Independent Financial Intelligence:
  - GET /api/v1/ai/insights
  - POST /api/v1/ai/suggest-category
  - GET /api/v1/ai/suggest-budget
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.ai import (
    InsightsResponse,
    SuggestBudgetResponse,
    SuggestCategoryRequest,
    SuggestCategoryResponse,
)
from app.schemas.common import DataResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])


@router.get(
    "/insights",
    response_model=DataResponse[InsightsResponse],
    summary="Get personalized AI financial recommendations and deficit alerts",
)
async def get_financial_insights(
    currency_symbol: str = Query(default="₹", max_length=5),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AI-2: Assemble spending metrics, category breakdown, and deficit status,
    and returns 3 structured, personalized advice chips from the active AI provider.
    """
    service = AIService(db)
    insights = await service.get_financial_insights(current_user, currency_symbol=currency_symbol)
    return DataResponse(data=insights)


@router.post(
    "/suggest-category",
    response_model=DataResponse[SuggestCategoryResponse],
    summary="Predict category and payment mode from expense title",
)
async def suggest_category(
    request: SuggestCategoryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AI-3: Predict the optimal category for a given expense title.
    """
    service = AIService(db)
    result = await service.suggest_category(current_user, request)
    return DataResponse(data=result)


@router.get(
    "/suggest-budget",
    response_model=DataResponse[SuggestBudgetResponse],
    summary="AI-recommended monthly and daily budget limits",
)
async def suggest_budget(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AI-4: Suggest realistic budget targets based on past spending velocity.
    """
    service = AIService(db)
    result = await service.suggest_budget(current_user)
    return DataResponse(data=result)
