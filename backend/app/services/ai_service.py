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
    ScanReceiptResponse,
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
        budget_info = summary.get("budget") or {}
        limit_amt = float(budget_info.get("limit_amount") or 0.0)
        rem_amt = float(budget_info.get("remaining_amount") or 0.0)
        monthly_budget = limit_amt if limit_amt > 0 else None
        remaining_budget = rem_amt if limit_amt > 0 else None
        daily_average = float(summary.get("average_daily_spent", 0.0) or 0.0)

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
        Suggests category, payment mode, and mood based on expense title, amount, and budget status.
        """
        from sqlalchemy import select
        from app.models.category import Category

        stmt = select(Category.name).where(Category.user_id == user.id)
        result = await self.session.execute(stmt)
        category_names = list(result.scalars().all())

        # Compute real-time budget context to detect over-budget/over-daily triggers
        budget_context = None
        try:
            summary = await self.dashboard_service.get_summary(user.id)
            budget_info = summary.get("budget") or {}
            rem_monthly = float(budget_info.get("remaining_amount") or 0.0)
            limit_monthly = float(budget_info.get("limit_amount") or 0.0)
            daily_limit = float(budget_info.get("daily_limit") or 0.0) if budget_info.get("daily_limit") else None
            today_spent = float(summary.get("today_spent") or 0.0)
            req_amount = float(request.amount or 0.0)

            is_over_monthly = limit_monthly > 0 and (req_amount > rem_monthly)
            is_over_daily = daily_limit is not None and (today_spent + req_amount > daily_limit)
            budget_context = {
                "is_over_monthly": is_over_monthly,
                "is_over_daily": is_over_daily,
                "remaining_monthly": rem_monthly,
            }
        except Exception as e:
            print(f"[AIService] budget_context error: {e}")

        provider = get_ai_provider(self.settings)
        return await provider.suggest_category(
            expense_title=request.title,
            amount=request.amount,
            available_categories=category_names,
            budget_context=budget_context,
        )

    async def scan_receipt(
        self, user: User, image_bytes: bytes, mime_type: str
    ) -> ScanReceiptResponse:
        """
        Multimodal AI Vision receipt and bill scanning.
        """
        from sqlalchemy import select
        from app.models.category import Category

        stmt = select(Category.name).where(Category.user_id == user.id)
        result = await self.session.execute(stmt)
        category_names = list(result.scalars().all())

        provider = get_ai_provider(self.settings)
        return await provider.scan_receipt(
            image_bytes=image_bytes,
            mime_type=mime_type,
            available_categories=category_names,
        )

    async def suggest_budget(self, user: User) -> SuggestBudgetResponse:
        """
        Suggests optimal monthly budget and daily caps based on past month trends.
        """
        summary = await self.dashboard_service.get_summary(user.id)
        top_cats = await self.dashboard_service.get_top_categories(user.id, limit=5)

        total_spent = float(summary.get("total_spent", 0.0) or 0.0)
        daily_average = float(summary.get("average_daily_spent", 0.0) or 0.0)

        top_categories = [
            {
                "name": cat.get("category_name") or cat.get("name") or "General",
                "amount": float(cat.get("total") or cat.get("amount", 0.0) or 0.0),
            }
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
        budget_info = summary.get("budget") or {}
        limit_amt = float(budget_info.get("limit_amount") or 0.0)
        rem_amt = float(budget_info.get("remaining_amount") or 0.0)
        monthly_budget = limit_amt if limit_amt > 0 else None
        remaining_budget = rem_amt if limit_amt > 0 else None
        daily_average = float(summary.get("average_daily_spent", 0.0) or 0.0)

        top_categories = [
            {
                "name": cat.get("category_name") or cat.get("name") or "General",
                "amount": float(cat.get("total") or cat.get("amount", 0.0) or 0.0),
            }
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

