"""
BudgetBrain — Google Gemini AI Provider

Integrates with Google Gemini models (gemini-1.5-flash, gemini-2.0-flash)
via official REST API with zero external client dependencies.
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
        import random
        angles = [
            "Focus on practical expense reduction, daily burn rate, and deficit avoidance.",
            "Focus on category spending concentration, 50/30/20 rule, and smart savings.",
            "Focus on lifestyle spending habits, weekend pacing, and discretionary expense trims.",
        ]
        perspective = random.choice(angles)

        prompt = f"""
You are BudgetBrain AI, a sharp, encouraging personal financial advisor.
Analyze the user's spending metrics and generate exactly 3 personalized, concise, actionable financial insights in valid JSON format.
Perspective for this review: {perspective}

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
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            if raw_text.startswith("```"):
                                lines = raw_text.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].strip() == "```":
                                    lines = lines[:-1]
                                raw_text = "\n".join(lines).strip()

                            parsed = json.loads(raw_text)
                            if isinstance(parsed, dict):
                                for k in ["insights", "recommendations", "items", "data"]:
                                    if k in parsed and isinstance(parsed[k], list):
                                        parsed = parsed[k]
                                        break
                                else:
                                    parsed = [parsed]

                            if isinstance(parsed, list) and len(parsed) > 0:
                                valid_items = []
                                for idx, item in enumerate(parsed[:3]):
                                    if isinstance(item, dict):
                                        valid_items.append(
                                            FinancialInsight(
                                                id=item.get("id", f"gemini-insight-{idx+1}"),
                                                type=item.get("type", "saving_tip"),
                                                title=item.get("title", "Financial Tip"),
                                                message=item.get("message", ""),
                                                icon=item.get("icon", "lightbulb"),
                                                severity=item.get("severity", "info"),
                                                metric=item.get("metric"),
                                            )
                                        )
                                if valid_items:
                                    return valid_items
                else:
                    print(f"[GeminiProvider] API Error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[GeminiProvider] Exception: {e}, falling back to rules engine.")

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
        prompt = f"""
You are BudgetBrain AI, an intelligent personal finance categorization engine.
Categorize this transaction and suggest the most appropriate payment mode:
- Expense Title: "{expense_title}"
- Amount: {f"{amount}" if amount else "Not specified"}
- User's Available Categories: {json.dumps(available_categories)}

Rules:
1. "suggested_category" MUST preferably match one of the User's Available Categories if relevant.
2. "suggested_payment_mode" MUST be one of: "upi", "card", "cash", "other".
3. "confidence" MUST be a float between 0.0 and 1.0.
4. "reasoning" should be 1 short concise sentence.

Return ONLY raw JSON with structure:
{{
  "suggested_category": "Category Name",
  "confidence": 0.95,
  "suggested_payment_mode": "upi",
  "reasoning": "Reason for suggestion"
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw = parts[0].get("text", "").strip()
                            if raw.startswith("```"):
                                lines = raw.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].strip() == "```":
                                    lines = lines[:-1]
                                raw = "\n".join(lines).strip()
                            parsed = json.loads(raw)
                            mode = str(parsed.get("suggested_payment_mode", "upi")).lower()
                            if mode not in ["cash", "card", "upi", "other"]:
                                mode = "upi" if "upi" in mode else "card"
                            return SuggestCategoryResponse(
                                suggested_category=parsed.get("suggested_category") or (available_categories[0] if available_categories else "General"),
                                confidence=float(parsed.get("confidence", 0.90)),
                                suggested_payment_mode=mode,
                                reasoning=parsed.get("reasoning", "Suggested by Gemini AI"),
                            )
        except Exception as e:
            print(f"[GeminiProvider] suggest_category warning: {e}, using fallback.")

        return await self.fallback.suggest_category(expense_title, amount, available_categories)

    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        if not self.api_key:
            return await self.fallback.suggest_budget(monthly_spend, daily_avg, top_categories)

        prompt = f"""
You are BudgetBrain AI, a certified financial planning advisor.
Recommend realistic monthly and daily budget limits based on the user's spending trends:
- Current Monthly Spend: {monthly_spend}
- Daily Spending Average: {daily_avg}
- Top Categories: {json.dumps(top_categories)}

Output strictly valid JSON:
{{
  "recommended_monthly_limit": 35000.0,
  "recommended_daily_limit": 1100.0,
  "estimated_savings_rate": 15.0,
  "rationale": "2-sentence clear explanation with specific savings numbers."
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw = parts[0].get("text", "").strip()
                            if raw.startswith("```"):
                                lines = raw.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].strip() == "```":
                                    lines = lines[:-1]
                                raw = "\n".join(lines).strip()
                            parsed = json.loads(raw)
                            return SuggestBudgetResponse(
                                recommended_monthly_limit=float(parsed["recommended_monthly_limit"]),
                                recommended_daily_limit=float(parsed["recommended_daily_limit"]),
                                estimated_savings_rate=float(parsed.get("estimated_savings_rate", 15.0)),
                                rationale=parsed.get("rationale", "Calculated by Gemini AI based on your spending."),
                            )
        except Exception as e:
            print(f"[GeminiProvider] suggest_budget warning: {e}, using fallback.")

        return await self.fallback.suggest_budget(monthly_spend, daily_avg, top_categories)

    async def chat(
        self,
        messages: list[ChatMessage],
        financial_context: dict,
    ) -> ChatResponse:
        if not self.api_key:
            return await self.fallback.chat(messages, financial_context)

        sym = financial_context.get("currency_symbol", "₹")
        user_name = financial_context.get("user_name", "User")
        total_spent = financial_context.get("total_spent", 0.0)
        monthly_budget = financial_context.get("monthly_budget")
        remaining_budget = financial_context.get("remaining_budget")
        daily_average = financial_context.get("daily_average", 0.0)
        top_cats = financial_context.get("top_categories", [])

        system_instruction = f"""
You are BudgetBrain AI, a sharp, supportive personal finance assistant built into BudgetBrain.
You have real-time access to the user's financial telemetry:
- User Name: {user_name}
- Currency: {sym}
- Total Spent This Month: {sym}{total_spent:,.2f}
- Monthly Budget Limit: {f"{sym}{monthly_budget:,.2f}" if monthly_budget else "Not set"}
- Remaining Balance: {f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"}
- Deficit Status: {"YES, IN DEFICIT of " + str(abs(remaining_budget)) if remaining_budget and remaining_budget < 0 else "NO DEFICIT"}
- Daily Average Spend: {sym}{daily_average:,.2f}
- Top Spending Categories: {json.dumps(top_cats)}

Instructions:
1. Answer questions directly using their exact numbers.
2. If asked "Can I afford X", compute remaining budget minus X and state clearly whether it will cause a deficit.
3. Keep responses concise, well-formatted with markdown bolding, and encouraging.
4. Output JSON with fields:
   - "reply": Markdown formatted answer string
   - "suggested_actions": Array of 3 short follow-up prompts user might ask next (e.g. ["Can I afford ₹2,000?", "Where is my money going?"])
"""

        # Convert messages to Gemini format
        contents = [{"parts": [{"text": system_instruction}]}]
        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.content}]})

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "response_mime_type": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw = parts[0].get("text", "").strip()
                            if raw.startswith("```"):
                                lines = raw.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].strip() == "```":
                                    lines = lines[:-1]
                                raw = "\n".join(lines).strip()
                            parsed = json.loads(raw)
                            reply = parsed.get("reply") or raw
                            actions = parsed.get("suggested_actions") or []
                            return ChatResponse(
                                reply=reply,
                                suggested_actions=actions[:3],
                                provider=self.provider_name,
                                model=self.model_name,
                            )
        except Exception as e:
            print(f"[GeminiProvider] chat warning: {e}, using fallback.")

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
        prompt = f"""
You are BudgetBrain AI, a behavioral economics and emotional spending advisor.
Analyze the user's emotion-tagged expense metrics and produce 2-3 psychological, highly actionable advice cards.

User Data:
- Name: {user_name}
- Currency: {sym}
- Spend by Mood: {json.dumps(mood_breakdown)}
- Impulse Spending Telemetry: {json.dumps(impulse_data)}
- Dominant Category Triggers: {json.dumps(dominant_triggers)}

JSON Output Format (Array of 2-3 objects):
[
  {{
    "id": "emotion-1",
    "title": "Short title (max 5 words)",
    "message": "1-2 empathetic sentences analyzing their emotion-spend pattern with specific numbers.",
    "severity": "info" | "warning" | "opportunity",
    "icon": "alert-triangle" | "flame" | "sparkles" | "heart"
  }}
]
Return ONLY raw JSON array.
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "response_mime_type": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw = parts[0].get("text", "").strip()
                            if raw.startswith("```"):
                                lines = raw.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].strip() == "```":
                                    lines = lines[:-1]
                                raw = "\n".join(lines).strip()
                            parsed = json.loads(raw)
                            if isinstance(parsed, dict) and "insights" in parsed:
                                parsed = parsed["insights"]
                            if isinstance(parsed, list) and len(parsed) > 0:
                                return [
                                    EmotionalAIAdvice(
                                        id=item.get("id", f"gemini-emo-{i}"),
                                        title=item.get("title", "Emotional Insight"),
                                        message=item.get("message", ""),
                                        severity=item.get("severity", "info"),
                                        icon=item.get("icon", "sparkles"),
                                    )
                                    for i, item in enumerate(parsed[:3])
                                ]
        except Exception as e:
            print(f"[GeminiProvider] generate_emotional_insights warning: {e}, using fallback.")

        return await self.fallback.generate_emotional_insights(
            user_name, currency_symbol, mood_breakdown, impulse_data, dominant_triggers
        )


