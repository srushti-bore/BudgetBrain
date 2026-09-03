"""
BudgetBrain — Rules-Based Fallback AI Provider

Zero-cost, offline-safe mathematical and financial analysis engine.
Activated when no external LLM API key is provided or as a graceful fallback.
"""

from app.schemas.ai import FinancialInsight, SuggestBudgetResponse, SuggestCategoryResponse
from app.services.ai.base import BaseLLMProvider


class RulesProvider(BaseLLMProvider):
    @property
    def provider_name(self) -> str:
        return "rules"

    @property
    def default_model(self) -> str:
        return "budgetbrain-rules-v1"

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
        insights: list[FinancialInsight] = []
        sym = currency_symbol or "₹"

        # Insight 1: Deficit or Budget Pacing
        if monthly_budget and monthly_budget > 0:
            if remaining_budget is not None and remaining_budget < 0:
                deficit_val = abs(remaining_budget)
                insights.append(
                    FinancialInsight(
                        id="insight-deficit",
                        type="deficit_alert",
                        title="Deficit Alert: Spending Exceeded",
                        message=(
                            f"You have exceeded your monthly limit by {sym}{deficit_val:,.2f}. "
                            f"To recover, pause non-essential discretionary expenses for the rest of the month."
                        ),
                        icon="alert-triangle",
                        severity="critical",
                        metric=f"-{sym}{deficit_val:,.0f}",
                    )
                )
            else:
                pct_spent = (total_spent / monthly_budget) * 100
                if pct_spent > 85:
                    insights.append(
                        FinancialInsight(
                            id="insight-near-limit",
                            type="deficit_alert",
                            title="Approaching Monthly Budget Limit",
                            message=(
                                f"You have utilized {pct_spent:.1f}% of your {sym}{monthly_budget:,.0f} limit. "
                                f"You have {sym}{remaining_budget:,.2f} remaining to last the rest of the month."
                            ),
                            icon="alert-triangle",
                            severity="warning",
                            metric=f"{pct_spent:.0f}% spent",
                        )
                    )
                else:
                    insights.append(
                        FinancialInsight(
                            id="insight-on-track",
                            type="saving_tip",
                            title="Healthy Spending Discipline",
                            message=(
                                f"You have spent {pct_spent:.1f}% of your budget. "
                                f"Your remaining reserve is {sym}{remaining_budget:,.2f}. Great job pacing your spending!"
                            ),
                            icon="lightbulb",
                            severity="opportunity",
                            metric=f"{sym}{remaining_budget:,.0f} left",
                        )
                    )
        else:
            insights.append(
                FinancialInsight(
                    id="insight-no-budget",
                    type="saving_tip",
                    title="Unlock Anti-Deficit Protection",
                    message="You haven't set a monthly budget yet! Setting a spending target helps prevent impulse purchases.",
                    icon="lightbulb",
                    severity="info",
                    metric="Target unset",
                )
            )

        # Insight 2: Category Concentration
        if top_categories and len(top_categories) > 0:
            top_cat = top_categories[0]
            cat_name = top_cat.get("name", "Top Category")
            cat_spent = float(top_cat.get("amount", 0.0))
            if total_spent > 0:
                cat_pct = (cat_spent / total_spent) * 100
                if cat_pct >= 30:
                    saving_pot = cat_spent * 0.15
                    insights.append(
                        FinancialInsight(
                            id="insight-category-focus",
                            type="category_focus",
                            title=f"High Concentration: {cat_name}",
                            message=(
                                f"{cat_name} accounts for {cat_pct:.1f}% of your total expenses ({sym}{cat_spent:,.2f}). "
                                f"Trimming this category by just 15% would save you {sym}{saving_pot:,.2f}."
                            ),
                            icon="pie-chart",
                            severity="opportunity" if cat_pct < 50 else "warning",
                            metric=f"{cat_pct:.0f}% of spend",
                        )
                    )

        # Fallback starter cards if user has few or zero transactions yet
        if len(insights) < 2:
            insights.append(
                FinancialInsight(
                    id="insight-starter-habit",
                    type="saving_tip",
                    title="Adopt the 50/30/20 Rule",
                    message="Aim to allocate 50% of income to essential needs, 30% to lifestyle wants, and 20% to emergency savings.",
                    icon="pie-chart",
                    severity="opportunity",
                    metric="50/30/20 Target",
                )
            )

        if len(insights) < 3:
            insights.append(
                FinancialInsight(
                    id="insight-starter-logging",
                    type="spending_velocity",
                    title="Rapid Expense Logging",
                    message="Logging expenses daily under 30 seconds keeps your spending velocity visible and prevents month-end deficits.",
                    icon="trending-up",
                    severity="info",
                    metric="Track Daily",
                )
            )

        return insights[:3]

    async def suggest_category(
        self,
        expense_title: str,
        amount: float | None,
        available_categories: list[str],
    ) -> SuggestCategoryResponse:
        title_lower = expense_title.lower().strip()

        food_keywords = ["swiggy", "zomato", "starbucks", "mcdonalds", "restaurant", "cafe", "dinner", "lunch", "grocery", "dmart", "blinkit", "zepto"]
        travel_keywords = ["uber", "ola", "metro", "petrol", "diesel", "fuel", "flight", "train", "auto", "taxi", "bus"]
        bill_keywords = ["electricity", "recharge", "wifi", "broadband", "rent", "water", "gas", "netflix", "spotify", "prime", "gym", "subscription"]
        shopping_keywords = ["amazon", "flipkart", "myntra", "clothes", "shoes", "mall", "electronics"]

        predicted = "General"
        reason = "Matched typical personal finance patterns"

        for word in food_keywords:
            if word in title_lower:
                predicted = "Food & Dining"
                reason = f"Identified dining/grocery keyword '{word}'"
                break

        if predicted == "General":
            for word in travel_keywords:
                if word in title_lower:
                    predicted = "Transportation"
                    reason = f"Identified transit/commute keyword '{word}'"
                    break

        if predicted == "General":
            for word in bill_keywords:
                if word in title_lower:
                    predicted = "Utilities & Bills"
                    reason = f"Identified recurring bill keyword '{word}'"
                    break

        if predicted == "General":
            for word in shopping_keywords:
                if word in title_lower:
                    predicted = "Shopping"
                    reason = f"Identified retail keyword '{word}'"
                    break

        # Match against user's actual category list if available
        matched_category = None
        for cat in available_categories:
            if cat.lower() in predicted.lower() or predicted.lower() in cat.lower():
                matched_category = cat
                break

        final_category = matched_category or (available_categories[0] if available_categories else predicted)

        return SuggestCategoryResponse(
            suggested_category=final_category,
            confidence=0.85 if matched_category else 0.60,
            suggested_payment_mode="upi" if any(w in title_lower for w in ["swiggy", "blinkit", "tea", "chai", "auto"]) else "card",
            reasoning=reason,
        )

    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        base_target = monthly_spend if monthly_spend > 0 else (daily_avg * 30 if daily_avg > 0 else 30000.0)
        recommended_monthly = round(base_target * 1.10, -2)  # 10% safety buffer rounded to 100
        recommended_daily = round(recommended_monthly / 30, -1)

        return SuggestBudgetResponse(
            recommended_monthly_limit=recommended_monthly,
            recommended_daily_limit=recommended_daily,
            estimated_savings_rate=15.0,
            rationale=(
                f"Calculated from your current spending pace ({monthly_spend:,.0f}). "
                f"A 10% buffer with a {recommended_daily:,.0f}/day cap gives you spending flexibility while preventing deficit."
            ),
        )
