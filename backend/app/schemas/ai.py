"""
BudgetBrain — AI Schemas & Data Contracts

SRS §3.7:
  Defines contracts for Provider-Independent AI Recommendations,
  Smart Financial Insights, Categorization, and Conversational Advice.
"""

from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field


class FinancialInsight(BaseModel):
    id: str
    type: Literal["saving_tip", "deficit_alert", "spending_velocity", "category_focus"] = "saving_tip"
    title: str
    message: str
    icon: Literal["lightbulb", "alert-triangle", "trending-up", "pie-chart"] = "lightbulb"
    severity: Literal["info", "warning", "opportunity", "critical"] = "info"
    metric: str | None = None


class InsightsResponse(BaseModel):
    provider: str
    model: str
    insights: list[FinancialInsight]
    summary: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SuggestCategoryRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    amount: float | None = None


class SuggestCategoryResponse(BaseModel):
    suggested_category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    suggested_payment_mode: str | None = None
    reasoning: str | None = None


class SuggestBudgetResponse(BaseModel):
    recommended_monthly_limit: float
    recommended_daily_limit: float
    estimated_savings_rate: float
    rationale: str
