"""
BudgetBrain — OpenAI & Compatible LLM Provider

Supports OpenAI models (gpt-4o-mini, gpt-4o) and self-hosted / alternative
compatible endpoints (Ollama, Groq, vLLM, DeepSeek) via OPENAI_BASE_URL.
"""

import json
import httpx
from app.schemas.ai import (
    ChatMessage,
    ChatResponse,
    FinancialInsight,
    SuggestBudgetResponse,
    SuggestCategoryResponse,
)
from app.schemas.emotional_spending import EmotionalAIAdvice
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
        system_prompt = (
            "You are BudgetBrain AI, an intelligent finance categorization engine. "
            "Return valid JSON with: suggested_category (string, preferably from available categories), "
            "confidence (float 0.0-1.0), suggested_payment_mode ('upi', 'card', 'cash', or 'other'), "
            "and reasoning (short explanation)."
        )
        user_prompt = f"Title: '{expense_title}', Amount: {amount}, Available categories: {json.dumps(available_categories)}"

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
            "temperature": 0.1,
            "response_format": {"type": "json_object"} if "gpt-4" in self.model_name else None,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    mode = str(parsed.get("suggested_payment_mode", "upi")).lower()
                    if mode not in ["cash", "card", "upi", "other"]:
                        mode = "upi" if "upi" in mode else "card"
                    return SuggestCategoryResponse(
                        suggested_category=parsed.get("suggested_category") or (available_categories[0] if available_categories else "General"),
                        confidence=float(parsed.get("confidence", 0.92)),
                        suggested_payment_mode=mode,
                        reasoning=parsed.get("reasoning", "Suggested by OpenAI"),
                    )
        except Exception as e:
            print(f"[OpenAIProvider] suggest_category warning: {e}, using fallback.")

        return await self.fallback.suggest_category(expense_title, amount, available_categories)

    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        if not self.api_key:
            return await self.fallback.suggest_budget(monthly_spend, daily_avg, top_categories)

        system_prompt = "You are BudgetBrain AI, a certified financial advisor. Return valid JSON with recommended_monthly_limit, recommended_daily_limit, estimated_savings_rate, and rationale."
        user_prompt = f"Monthly spend: {monthly_spend}, Daily avg: {daily_avg}, Categories: {json.dumps(top_categories)}"

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model_name,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            "temperature": 0.2,
            "response_format": {"type": "json_object"} if "gpt-4" in self.model_name else None,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    parsed = json.loads(data["choices"][0]["message"]["content"])
                    return SuggestBudgetResponse(
                        recommended_monthly_limit=float(parsed["recommended_monthly_limit"]),
                        recommended_daily_limit=float(parsed["recommended_daily_limit"]),
                        estimated_savings_rate=float(parsed.get("estimated_savings_rate", 15.0)),
                        rationale=parsed.get("rationale", "Calculated by OpenAI."),
                    )
        except Exception as e:
            print(f"[OpenAIProvider] suggest_budget warning: {e}, using fallback.")

        return await self.fallback.suggest_budget(monthly_spend, daily_avg, top_categories)

    async def chat(
        self,
        messages: list[ChatMessage],
        financial_context: dict,
    ) -> ChatResponse:
        if not self.api_key:
            return await self.fallback.chat(messages, financial_context)

        sym = financial_context.get("currency_symbol", "₹")
        system_prompt = (
            "You are BudgetBrain AI, a smart personal finance advisor. "
            f"User telemetry: {json.dumps(financial_context)}. "
            "Answer questions using their exact numbers. "
            "Output JSON with 'reply' (markdown string) and 'suggested_actions' (list of 3 short question strings)."
        )

        chat_history = [{"role": "system", "content": system_prompt}]
        for m in messages:
            chat_history.append({"role": m.role, "content": m.content})

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model_name,
            "messages": chat_history,
            "temperature": 0.4,
            "response_format": {"type": "json_object"} if "gpt-4" in self.model_name else None,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    parsed = json.loads(data["choices"][0]["message"]["content"])
                    return ChatResponse(
                        reply=parsed.get("reply", "Here is your advice."),
                        suggested_actions=parsed.get("suggested_actions", [])[:3],
                        provider=self.provider_name,
                        model=self.model_name,
                    )
        except Exception as e:
            print(f"[OpenAIProvider] chat warning: {e}, using fallback.")

        return await self.fallback.chat(messages, financial_context)

    async def generate_emotional_insights(
        self,
        user_name: str,
        currency_symbol: str,
        mood_breakdown: list[dict],
        impulse_data: dict,
        dominant_triggers: list[dict],
    ) -> list[EmotionalAIAdvice]:
        if not self.api_key:
            return await self.fallback.generate_emotional_insights(
                user_name, currency_symbol, mood_breakdown, impulse_data, dominant_triggers
            )

        sym = currency_symbol or "₹"
        system_prompt = (
            "You are BudgetBrain AI, a behavioral financial psychology expert. "
            "Output strictly valid JSON with an array of 2-3 psychological advice objects with fields: "
            "id, title (short), message (1-2 sentences), severity ('info' | 'warning' | 'opportunity'), icon."
        )
        user_prompt = f"User: {user_name}, Currency: {sym}, Moods: {json.dumps(mood_breakdown)}, Impulse: {json.dumps(impulse_data)}"

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model_name,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            "temperature": 0.3,
            "response_format": {"type": "json_object"} if "gpt-4" in self.model_name else None,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    parsed = json.loads(data["choices"][0]["message"]["content"])
                    if isinstance(parsed, dict) and "insights" in parsed:
                        parsed = parsed["insights"]
                    if isinstance(parsed, list):
                        return [EmotionalAIAdvice(**item) for item in parsed[:3]]
        except Exception as e:
            print(f"[OpenAIProvider] generate_emotional_insights warning: {e}, using fallback.")

        return await self.fallback.generate_emotional_insights(
            user_name, currency_symbol, mood_breakdown, impulse_data, dominant_triggers
        )


