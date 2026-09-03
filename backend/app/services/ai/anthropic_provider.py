"""
BudgetBrain — Anthropic Claude LLM Provider

Integrates with Anthropic Messages API (claude-3-5-haiku, claude-3-5-sonnet).
"""

import json
import httpx
from app.schemas.ai import FinancialInsight, SuggestBudgetResponse, SuggestCategoryResponse
from app.services.ai.base import BaseLLMProvider
from app.services.ai.rules_provider import RulesProvider


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model_name: str | None = None, temperature: float = 0.3):
        super().__init__(model_name=model_name, temperature=temperature)
        self.api_key = api_key
        self.fallback = RulesProvider()

    @property
    def provider_name(self) -> str:
        return "anthropic"

    @property
    def default_model(self) -> str:
        return "claude-3-5-haiku-20241022"

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
Analyze the user's spending data and generate exactly 3 personalized financial insights in strict JSON format.

User Data:
- Name: {user_name}
- Total Spent this Month: {sym}{total_spent:,.2f}
- Monthly Budget Limit: {f"{sym}{monthly_budget:,.2f}" if monthly_budget else "Not set"}
- Remaining Balance: {f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"}
- Deficit Status: {"YES, DEFICIT of " + str(abs(remaining_budget)) if remaining_budget and remaining_budget < 0 else "NO DEFICIT"}
- Daily Spend Average: {sym}{daily_average:,.2f}
- Top Categories: {json.dumps(top_categories)}

Output strictly a valid JSON array of 3 objects with keys:
id, type, title, message, icon, severity, metric.
No explanations, just the JSON array.
"""

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model_name,
            "max_tokens": 1000,
            "temperature": self.temperature,
            "messages": [{"role": "user", "content": prompt}],
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["content"][0]["text"]
                    parsed = json.loads(content.strip("```json\n").strip("```"))
                    if isinstance(parsed, list):
                        return [FinancialInsight(**item) for item in parsed][:3]
        except Exception as e:
            print(f"[AnthropicProvider] Warning: {e}, falling back to rules engine.")

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
