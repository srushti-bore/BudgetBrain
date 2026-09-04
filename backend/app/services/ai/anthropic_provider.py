"""
BudgetBrain — Anthropic Claude LLM Provider

Integrates with Anthropic Messages API (claude-3-5-haiku, claude-3-5-sonnet).
"""

import base64
import json
import httpx
from app.schemas.ai import (
    ChatMessage,
    ChatResponse,
    FinancialInsight,
    ScanReceiptResponse,
    SuggestBudgetResponse,
    SuggestCategoryResponse,
)
from app.schemas.emotional_spending import EmotionalAIAdvice
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
        budget_context: dict | None = None,
    ) -> SuggestCategoryResponse:
        system_prompt = (
            "You are BudgetBrain AI, an intelligent personal finance categorization assistant. "
            "Return valid JSON ONLY with fields: suggested_category (string, preferably from available categories), "
            "confidence (float between 0.0 and 1.0), suggested_payment_mode ('upi', 'card', 'cash', or 'other'), "
            "and reasoning (short explanation)."
        )
        user_prompt = f"Title: '{expense_title}', Amount: {amount}, Available categories: {json.dumps(available_categories)}"

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "max_tokens": 200,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data["content"][0]["text"].strip()
                    if text.startswith("```"):
                        lines = text.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].strip() == "```":
                            lines = lines[:-1]
                        text = "\n".join(lines).strip()
                    parsed = json.loads(text)
                    mode = str(parsed.get("suggested_payment_mode", "upi")).lower()
                    if mode not in ["cash", "card", "upi", "other"]:
                        mode = "upi" if "upi" in mode else "card"
                    return SuggestCategoryResponse(
                        suggested_category=parsed.get("suggested_category") or (available_categories[0] if available_categories else "General"),
                        confidence=float(parsed.get("confidence", 0.90)),
                        suggested_payment_mode=mode,
                        reasoning=parsed.get("reasoning", "Suggested by Claude AI"),
                    )
        except Exception as e:
            print(f"[AnthropicProvider] suggest_category warning: {e}, using fallback.")

        return await self.fallback.suggest_category(expense_title, amount, available_categories, budget_context)

    async def scan_receipt(
        self,
        image_bytes: bytes,
        mime_type: str,
        available_categories: list[str],
    ) -> ScanReceiptResponse:
        if not self.api_key:
            return await self.fallback.scan_receipt(image_bytes, mime_type, available_categories)

        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        media_type = mime_type or "image/jpeg"

        prompt = f"""You are BudgetBrain AI, an expert receipt, bill, and invoice scanner.
Extract expense data from this image:
- title: Merchant or vendor name
- amount: Total grand total paid as float
- date: Transaction date YYYY-MM-DD or null
- category: Best matching category from: {json.dumps(available_categories)}
- payment_mode: "upi" | "card" | "cash" | "other"
- mood: "happy" | "normal" | "sad" | "stressed" | "excited"
- mood_reason: Reason for predicted mood
- notes: 1-line item summary

Return ONLY raw JSON:
{{
  "title": "Merchant Name",
  "amount": 100.0,
  "date": "2026-09-03",
  "category": "Food & Dining",
  "payment_mode": "upi",
  "mood": "normal",
  "mood_reason": "Everyday groceries",
  "notes": "Items list"
}}"""

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "max_tokens": 500,
            "temperature": 0.1,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_image,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages", headers=headers, json=payload
                )
                if res.status_code == 200:
                    data = res.json()
                    raw = data["content"][0]["text"].strip()
                    # Strip markdown code fences if present
                    if raw.startswith("```"):
                        lines = raw.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].strip() == "```":
                            lines = lines[:-1]
                        raw = "\n".join(lines).strip()
                    parsed = json.loads(raw)
                    amt = parsed.get("amount")
                    amt_float = float(amt) if amt is not None else None
                    mode = str(parsed.get("payment_mode", "card")).lower()
                    if mode not in ["cash", "card", "upi", "other"]:
                        mode = "upi" if "upi" in mode else "card"
                    m = str(parsed.get("mood", "normal")).lower()
                    if m not in ["happy", "normal", "sad", "stressed", "excited"]:
                        m = "normal"
                    cat = parsed.get("category") or (
                        available_categories[0] if available_categories else "General"
                    )
                    return ScanReceiptResponse(
                        title=parsed.get("title") or "Scanned Receipt",
                        amount=amt_float,
                        date=parsed.get("date"),
                        category=cat,
                        payment_mode=mode,
                        mood=m,
                        mood_reason=parsed.get("mood_reason", "AI detected from receipt"),
                        notes=parsed.get("notes"),
                        confidence=0.95,
                    )
        except Exception as e:
            print(f"[AnthropicProvider] scan_receipt warning: {e}, using fallback.")

        return await self.fallback.scan_receipt(image_bytes, mime_type, available_categories)

    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        return await self.fallback.suggest_budget(monthly_spend, daily_avg, top_categories)

    async def chat(
        self,
        messages: list[ChatMessage],
        financial_context: dict,
    ) -> ChatResponse:
        if not self.api_key:
            return await self.fallback.chat(messages, financial_context)

        system_prompt = (
            "You are BudgetBrain AI, an intelligent personal finance assistant. "
            f"User telemetry: {json.dumps(financial_context)}. "
            "Answer questions using their exact numbers in friendly markdown. "
            "Output valid JSON with 'reply' (markdown string) and 'suggested_actions' (list of 3 short questions)."
        )

        claude_msgs = []
        for m in messages:
            role = "user" if m.role == "user" else "assistant"
            claude_msgs.append({"role": role, "content": m.content})

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "max_tokens": 1000,
            "temperature": 0.4,
            "system": system_prompt,
            "messages": claude_msgs,
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["content"][0]["text"]
                    parsed = json.loads(content)
                    return ChatResponse(
                        reply=parsed.get("reply", content),
                        suggested_actions=parsed.get("suggested_actions", [])[:3],
                        provider=self.provider_name,
                        model=self.model_name,
                    )
        except Exception as e:
            print(f"[AnthropicProvider] chat warning: {e}, using fallback.")

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
            "You are BudgetBrain AI, an expert behavioral economist. "
            "Analyze the user's emotion-aware spend metrics and output JSON with an array 'insights' of 2-3 objects: "
            "id, title, message, severity ('info' | 'warning' | 'opportunity'), icon ('alert-triangle' | 'flame' | 'sparkles' | 'heart')."
        )
        user_prompt = f"User: {user_name}, Currency: {sym}, Moods: {json.dumps(mood_breakdown)}, Impulse: {json.dumps(impulse_data)}"

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "max_tokens": 1000,
            "temperature": 0.3,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    parsed = json.loads(data["content"][0]["text"])
                    if isinstance(parsed, dict) and "insights" in parsed:
                        parsed = parsed["insights"]
                    if isinstance(parsed, list):
                        return [EmotionalAIAdvice(**item) for item in parsed[:3]]
        except Exception as e:
            print(f"[AnthropicProvider] generate_emotional_insights warning: {e}, using fallback.")

        return await self.fallback.generate_emotional_insights(
            user_name, currency_symbol, mood_breakdown, impulse_data, dominant_triggers
        )


