"""
BudgetBrain — Google Gemini AI Provider

Integrates with Google Gemini models (gemini-1.5-flash, gemini-2.0-flash)
via official REST API with zero external client dependencies.
"""

import json
import httpx
from app.schemas.ai import FinancialInsight, SuggestBudgetResponse, SuggestCategoryResponse
from app.services.ai.base import BaseLLMProvider
from app.services.ai.rules_provider import RulesProvider


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model_name: str | None = None, temperature: float = 0.3):
        super().__init__(model_name=model_name, temperature=temperature)
        self.api_key = api_key
        self.fallback = RulesProvider()

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def default_model(self) -> str:
        return "gemini-1.5-flash"

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
        if not self.api_key:
            return await self.fallback.generate_financial_insights(
                user_name, currency_symbol, total_spent, monthly_budget,
                remaining_budget, daily_average, top_categories, recent_expenses
            )

        sym = currency_symbol or "₹"
        prompt = f"""
You are BudgetBrain AI, an expert, encouraging personal financial advisor.
Analyze the user's spending data and generate exactly 3 personalized, concise, actionable financial insights in valid JSON format.

User Data:
- Name: {user_name}
- Currency: {sym}
- Total Spent this Month: {sym}{total_spent:,.2f}
- Monthly Budget Limit: {f"{sym}{monthly_budget:,.2f}" if monthly_budget else "Not set"}
- Remaining Balance: {f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"}
- Deficit Status: {"YES, DEFICIT of " + str(abs(remaining_budget)) if remaining_budget and remaining_budget < 0 else "NO DEFICIT"}
- Daily Spend Average: {sym}{daily_average:,.2f}
- Top Categories: {json.dumps(top_categories)}
- Recent Transactions: {json.dumps(recent_expenses)}

JSON Output Format (array of 3 objects):
[
  {{
    "id": "insight-1",
    "type": "saving_tip" | "deficit_alert" | "spending_velocity" | "category_focus",
    "title": "Short punchy title (max 5 words)",
    "message": "1-2 actionable sentences tailored to their numbers.",
    "icon": "lightbulb" | "alert-triangle" | "trending-up" | "pie-chart",
    "severity": "info" | "warning" | "opportunity" | "critical",
    "metric": "e.g. Save ₹2,500/mo or -₹3,000 deficit"
  }}
]

Return ONLY the raw JSON array. Do not enclose in markdown ticks if possible.
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "response_mime_type": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content.strip("```json\n").strip("```"))
                    return [FinancialInsight(**item) for item in parsed][:3]
        except Exception as e:
            # Fallback seamlessly if API limits reached or network error
            print(f"[GeminiProvider] Warning: {e}, falling back to rules engine.")

        return await self.fallback.generate_financial_insights(
            user_name, currency_symbol, total_spent, monthly_budget,
            remaining_budget, daily_average, top_categories, recent_expenses
        )

    async def suggest_category(
        self,
        expense_title: str,
        amount: float | None,
        available_categories: list[str],
    ) -> SuggestCategoryResponse:
        return await self.fallback.suggest_category(expense_title, amount, available_categories)

    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        return await self.fallback.suggest_budget(monthly_spend, daily_avg, top_categories)
