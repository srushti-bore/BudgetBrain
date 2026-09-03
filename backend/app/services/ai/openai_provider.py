"""
BudgetBrain — OpenAI & Compatible LLM Provider

Supports OpenAI models (gpt-4o-mini, gpt-4o) and self-hosted / alternative
compatible endpoints (Ollama, Groq, vLLM, DeepSeek) via OPENAI_BASE_URL.
"""

import json
import httpx
from app.schemas.ai import FinancialInsight, SuggestBudgetResponse, SuggestCategoryResponse
from app.services.ai.base import BaseLLMProvider
from app.services.ai.rules_provider import RulesProvider


class OpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
        model_name: str | None = None,
        temperature: float = 0.3,
    ):
        super().__init__(model_name=model_name, temperature=temperature)
        self.api_key = api_key
        self.base_url = (base_url.rstrip("/") if base_url else "https://api.openai.com/v1")
        self.fallback = RulesProvider()

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def default_model(self) -> str:
        return "gpt-4o-mini"

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
        system_prompt = (
            "You are BudgetBrain AI, a smart, encouraging personal financial advisor. "
            "Output strictly valid JSON with an array of 3 financial insight objects."
        )

        user_prompt = f"""
Analyze the user's spending data and generate 3 personalized financial insights.

User Data:
- Name: {user_name}
- Total Spent this Month: {sym}{total_spent:,.2f}
- Monthly Budget Limit: {f"{sym}{monthly_budget:,.2f}" if monthly_budget else "Not set"}
- Remaining Balance: {f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"}
- Deficit Status: {"YES, DEFICIT of " + str(abs(remaining_budget)) if remaining_budget and remaining_budget < 0 else "NO DEFICIT"}
- Daily Spend Average: {sym}{daily_average:,.2f}
- Top Categories: {json.dumps(top_categories)}

Format:
[
  {{
    "id": "insight-1",
    "type": "saving_tip" | "deficit_alert" | "spending_velocity" | "category_focus",
    "title": "Short title",
    "message": "1-2 actionable advice sentences",
    "icon": "lightbulb" | "alert-triangle" | "trending-up" | "pie-chart",
    "severity": "info" | "warning" | "opportunity" | "critical",
    "metric": "e.g. Save ₹3,000/mo"
  }}
]
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.temperature,
            "response_format": {"type": "json_object"} if "gpt-4" in self.model_name else None,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    if isinstance(parsed, dict) and "insights" in parsed:
                        parsed = parsed["insights"]
                    if isinstance(parsed, list):
                        return [FinancialInsight(**item) for item in parsed][:3]
        except Exception as e:
            print(f"[OpenAIProvider] Warning: {e}, falling back to rules engine.")

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
