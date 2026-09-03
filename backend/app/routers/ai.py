"""
BudgetBrain — AI Recommendations Router (Multi-Tenant)

SRS §3.7 & §5.2:
  Exposes endpoints for Provider-Independent Financial Intelligence:
  - GET /api/v1/ai/insights
  - POST /api/v1/ai/suggest-category
  - GET /api/v1/ai/suggest-budget
"""

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    InsightsResponse,
    ScanReceiptResponse,
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


@router.post(
    "/chat",
    response_model=DataResponse[ChatResponse],
    summary="Conversational financial assistant with user telemetry",
)
async def chat(
    request: ChatRequest,
    currency_symbol: str = Query(default="₹", max_length=5),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AI-5: Ask BudgetBrain conversational financial advisor questions.
    """
    service = AIService(db)
    result = await service.chat(current_user, request, currency_symbol=currency_symbol)
    return DataResponse(data=result)


@router.post(
    "/scan-receipt",
    response_model=DataResponse[ScanReceiptResponse],
    summary="Multimodal AI Vision receipt and bill scanning",
)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Receipt Scanner: Extracts merchant title, total amount, date,
    predicted category, payment mode, and mood from bill/receipt image.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        from app.exceptions import ValidationException
        raise ValidationException("Only image files (JPEG, PNG, WEBP, etc.) are supported for receipt scanning.", field="file")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        from app.exceptions import ValidationException
        raise ValidationException("Receipt image size must be under 10MB.", field="file")

    service = AIService(db)
    result = await service.scan_receipt(
        user=current_user,
        image_bytes=image_bytes,
        mime_type=file.content_type,
    )
    return DataResponse(data=result)


