"""
BudgetBrain — Base LLM Provider Interface

Defines the abstract interface for provider-independent AI models.
Supports Gemini, OpenAI, Anthropic Claude, and rule-based fallback.
"""

from abc import ABC, abstractmethod
from app.schemas.ai import (
    ChatMessage,
    ChatResponse,
    FinancialInsight,
    SuggestBudgetResponse,
    SuggestCategoryResponse,
)


class BaseLLMProvider(ABC):
    """Abstract interface that all AI providers must implement."""

    def __init__(self, model_name: str | None = None, temperature: float = 0.3):
        self.model_name = model_name or self.default_model
        self.temperature = temperature

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'gemini', 'openai', 'anthropic', 'rules')."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model identifier for this provider."""
        pass

    @abstractmethod
    async def generate_financial_insights(
        self,
        user_name: str,
        currency_symbol: str,
        total_spent: float,
        monthly_budget: float | None,
        remaining_budget: float | None,
        daily_average: float,
        top_categories: list[dict],
        recent_expenses: list[dict],
    ) -> list[FinancialInsight]:
        """
        Analyze current spending metrics and generate 3-4 structured, actionable insights.
        """
        pass

    @abstractmethod
    async def suggest_category(
        self,
        expense_title: str,
        amount: float | None,
        available_categories: list[str],
    ) -> SuggestCategoryResponse:
        """
        Predict the most relevant category and payment mode from expense title.
        """
        pass

    @abstractmethod
    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        """
        Suggest realistic monthly and daily budget caps based on past transactions.
        """
        pass

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        financial_context: dict,
    ) -> ChatResponse:
        """
        FR-AI-5: Multi-turn conversational financial advice with user context.
        """
        pass

