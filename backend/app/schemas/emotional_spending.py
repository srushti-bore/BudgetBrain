"""
BudgetBrain — Emotional Spending Schemas

Data contracts for Emotion-Aware Spending analytics, impulse detection,
and AI-based psychological spending advisory.
"""

from pydantic import BaseModel, Field


class MoodSummary(BaseModel):
    mood: str
    total_amount: float
    count: int
    percentage: float
    dominant_category: str | None = None


class ImpulsePattern(BaseModel):
    total_impulse_amount: float
    impulse_percentage: float
    flagged_transactions_count: int
    trigger_moods: list[str] = Field(default_factory=list)


class EmotionalAIAdvice(BaseModel):
    id: str
    title: str
    message: str
    severity: str = "info"  # "info" | "warning" | "opportunity" | "critical"
    icon: str = "sparkles"


class EmotionalSpendingResponse(BaseModel):
    period_start: str
    period_end: str
    total_tracked_amount: float
    mood_breakdown: list[MoodSummary]
    impulse_patterns: ImpulsePattern
    ai_insights: list[EmotionalAIAdvice]
    provider: str
    model: str
