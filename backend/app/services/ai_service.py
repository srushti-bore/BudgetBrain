"""
BudgetBrain — AI Service Orchestrator

SRS §3.7:
  Orchestrates financial data assembly and delegates to the active
  provider-independent LLM (Gemini, OpenAI, Claude, or Rules Fallback).
"""

from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User
from app.repositories.category_repository import CategoryRepository
from app.schemas.ai import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    InsightsResponse,
    SuggestBudgetResponse,
    SuggestCategoryRequest,
    SuggestCategoryResponse,
)
from app.services.ai.factory import get_ai_provider
from app.services.dashboard_service import DashboardService


class AIService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.dashboard_service = DashboardService(session)
        self.category_repo = CategoryRepository(session)
        self.settings = get_settings()

    async def get_financial_insights(self, user: User, currency_symbol: str = "₹") -> InsightsResponse:
        """
        Gathers tenant's spending summary and delegates to active AI provider.
        """
        summary = await self.dashboard_service.get_summary(user.id)
        top_cats = await self.dashboard_service.get_top_categories(user.id, limit=5)

        total_spent = float(summary.get("total_spent", 0.0) or 0.0)
        monthly_budget = float(summary.get("monthly_budget", 0.0)) if summary.get("monthly_budget") is not None else None
        remaining_budget = float(summary.get("remaining_budget", 0.0)) if summary.get("remaining_budget") is not None else None
        daily_average = float(summary.get("daily_spending_average", 0.0) or 0.0)

        # Sanitize recent expenses (remove IDs and tenant keys before sending to LLM)
        recent_raw = summary.get("recent_expenses", [])
        recent_expenses = []
        for exp in recent_raw[:5]:
            title = exp.get("title") if isinstance(exp, dict) else getattr(exp, "title", "Expense")
            amount = exp.get("amount") if isinstance(exp, dict) else getattr(exp, "amount", 0.0)
            date_val = exp.get("date") if isinstance(exp, dict) else getattr(exp, "date", "")
            recent_expenses.append({"title": title, "amount": float(amount or 0.0), "date": str(date_val)})

        # Sanitize top categories
        top_categories = [
            {"name": cat.get("name"), "amount": float(cat.get("amount", 0.0))}
            for cat in top_cats
        ]

        user_display = user.full_name or user.email.split("@")[0]
        provider = get_ai_provider(self.settings)

        insights = await provider.generate_financial_insights(
            user_name=user_display,
            currency_symbol=currency_symbol,
            total_spent=total_spent,
            monthly_budget=monthly_budget,
            remaining_budget=remaining_budget,
            daily_average=daily_average,
            top_categories=top_categories,
            recent_expenses=recent_expenses,
        )

        deficit_note = "Deficit detected." if (remaining_budget is not None and remaining_budget < 0) else "Budget on track."
        summary_text = (
            f"Generated {len(insights)} smart recommendations based on "
            f"{currency_symbol}{total_spent:,.0f} spent across {len(top_categories)} active categories. {deficit_note}"
        )

        return InsightsResponse(
            provider=provider.provider_name,
            model=provider.model_name,
            insights=insights,
            summary=summary_text,
        )

    async def suggest_category(
        self, user: User, request: SuggestCategoryRequest
    ) -> SuggestCategoryResponse:
        """
        Suggests category and payment mode based on expense title and user categories.
        """
        from sqlalchemy import select
        from app.models.category import Category

        stmt = select(Category.name).where(Category.user_id == user.id)
        result = await self.session.execute(stmt)
        category_names = list(result.scalars().all())

        provider = get_ai_provider(self.settings)
        return await provider.suggest_category(
            expense_title=request.title,
            amount=request.amount,
            available_categories=category_names,
        )

    async def suggest_budget(self, user: User) -> SuggestBudgetResponse:
        """
        Suggests optimal monthly budget and daily caps based on past month trends.
        """
        summary = await self.dashboard_service.get_summary(user.id)
        top_cats = await self.dashboard_service.get_top_categories(user.id, limit=5)

        total_spent = float(summary.get("total_spent", 0.0) or 0.0)
        daily_average = float(summary.get("daily_spending_average", 0.0) or 0.0)

        top_categories = [
            {"name": cat.get("name"), "amount": float(cat.get("amount", 0.0))}
            for cat in top_cats
        ]

        provider = get_ai_provider(self.settings)
        return await provider.suggest_budget(
            monthly_spend=total_spent,
            daily_avg=daily_average,
            top_categories=top_categories,
        )

    async def chat(
        self,
        user: User,
        request: ChatRequest,
        currency_symbol: str = "₹",
    ) -> ChatResponse:
        """
        FR-AI-5: Conversational financial assistant with real-time financial context.
        """
        summary = await self.dashboard_service.get_summary(user.id)
        top_cats = await self.dashboard_service.get_top_categories(user.id, limit=5)

        total_spent = float(summary.get("total_spent", 0.0) or 0.0)
        monthly_budget = float(summary.get("monthly_budget", 0.0)) if summary.get("monthly_budget") is not None else None
        remaining_budget = float(summary.get("remaining_budget", 0.0)) if summary.get("remaining_budget") is not None else None
        daily_average = float(summary.get("daily_spending_average", 0.0) or 0.0)

        top_categories = [
            {"name": cat.get("name"), "amount": float(cat.get("amount", 0.0))}
            for cat in top_cats
        ]

        user_display = user.full_name or user.email.split("@")[0]

        financial_context = {
            "user_name": user_display,
            "currency_symbol": currency_symbol,
            "total_spent": total_spent,
            "monthly_budget": monthly_budget,
            "remaining_budget": remaining_budget,
            "daily_average": daily_average,
            "top_categories": top_categories,
        }

        provider = get_ai_provider(self.settings)
        return await provider.chat(
            messages=request.messages,
            financial_context=financial_context,
        )

