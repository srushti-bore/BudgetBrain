"""
BudgetBrain — Rules-Based Fallback AI Provider

Zero-cost, offline-safe mathematical and financial analysis engine.
Activated when no external LLM API key is provided or as a graceful fallback.
"""

from datetime import date
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
        budget_context: dict | None = None,
    ) -> SuggestCategoryResponse:
        title_lower = expense_title.lower().strip()

        # Category keyword taxonomies
        taxonomy = {
            "Food & Dining": [
                "swiggy", "zomato", "starbucks", "mcdonalds", "kfc", "burger", "pizza",
                "dominos", "subway", "restaurant", "cafe", "dinner", "lunch", "breakfast",
                "chai", "tea", "coffee", "boba", "bakery", "cake", "snack", "dhaba",
                "bar", "pub", "groceries", "grocery", "dmart", "blinkit", "zepto",
                "instamart", "bigbasket", "vegetables", "fruits", "milk", "food"
            ],
            "Transportation": [
                "uber", "ola", "rapido", "metro", "petrol", "diesel", "fuel", "cng",
                "flight", "airline", "indigo", "air india", "train", "irctc", "railway",
                "auto", "taxi", "cab", "bus", "toll", "fastag", "parking", "commute", "travel"
            ],
            "Utilities & Bills": [
                "electricity", "power", "recharge", "mobile", "jio", "airtel", "vi",
                "wifi", "broadband", "act", "fiber", "rent", "water", "gas", "cylinder",
                "lpg", "maintenance", "society", "netflix", "spotify", "prime", "hotstar",
                "youtube", "gym", "fitness", "subscription", "bill", "emi", "loan"
            ],
            "Shopping": [
                "amazon", "flipkart", "myntra", "ajio", "meesho", "zara", "h&m",
                "clothes", "clothing", "shoes", "sneakers", "mall", "electronics",
                "croma", "apple", "gadget", "watch", "jewel", "shopping", "gift"
            ],
            "Healthcare": [
                "pharmacy", "chemist", "apollo", "1mg", "medicine", "doctor",
                "clinic", "hospital", "dental", "test", "lab", "meds", "medical"
            ],
            "Entertainment": [
                "movie", "cinema", "pvr", "inox", "bookmyshow", "game", "gaming",
                "concert", "show", "bowling", "trip", "hotel", "resort", "airbnb"
            ],
            "Education": [
                "book", "udemy", "coursera", "tuition", "school", "college",
                "fees", "course", "exam", "stationary"
            ],
        }

        predicted = "General"
        reason = "Matched typical expense profile"
        matched_keyword = None

        for cat_label, keywords in taxonomy.items():
            for kw in keywords:
                if kw in title_lower:
                    predicted = cat_label
                    matched_keyword = kw
                    reason = f"Identified '{kw}' matching {cat_label}"
                    break
            if predicted != "General":
                break

        # Check if any user category matches the title directly
        direct_user_cat = None
        for u_cat in available_categories:
            if u_cat.lower() in title_lower:
                direct_user_cat = u_cat
                break

        # Match against user's actual category list
        matched_category = direct_user_cat
        if not matched_category:
            for cat in available_categories:
                if cat.lower() in predicted.lower() or predicted.lower() in cat.lower():
                    matched_category = cat
                    break

        final_category = matched_category or (available_categories[0] if available_categories else predicted)

        # Payment mode heuristics
        upi_triggers = ["swiggy", "zomato", "blinkit", "zepto", "instamart", "chai", "tea", "auto", "rapido", "recharge", "grocery", "snack", "upi"]
        card_triggers = ["amazon", "flipkart", "flight", "hotel", "airline", "myntra", "apple", "electronics", "zara", "subscription", "annual", "card"]
        cash_triggers = ["cash", "rickshaw", "vegetable", "fruit", "tip", "maid", "chai stall"]

        suggested_mode = "upi"
        if any(w in title_lower for w in cash_triggers):
            suggested_mode = "cash"
        elif any(w in title_lower for w in card_triggers):
            suggested_mode = "card"
        elif any(w in title_lower for w in upi_triggers):
            suggested_mode = "upi"
        elif amount is not None and amount > 5000:
            suggested_mode = "card"

        # Mood auto-detection heuristics
        suggested_mood = "normal"
        mood_reason = "Routine everyday transaction"

        # Check budget limits first (user request: "jar outoff budget gel tar daily limit puthe get tar")
        if budget_context:
            if budget_context.get("is_over_monthly"):
                suggested_mood = "stressed"
                mood_reason = "Exceeds your active monthly budget cap"
            elif budget_context.get("is_over_daily"):
                suggested_mood = "stressed"
                mood_reason = "Exceeds your daily spending limit"

        if suggested_mood == "normal":
            excited_triggers = ["party", "celebration", "concert", "iphone", "gift", "vacation", "trip", "club", "drinks", "pub", "festival", "bonus", "shopping spree"]
            stressed_triggers = ["hospital", "doctor", "medicine", "late night", "fine", "penalty", "repair", "dentist", "emergency", "urgent", "emi", "interest"]
            sad_triggers = ["breakup", "sad", "therapy", "comfort", "ice cream"]
            happy_triggers = ["treat", "spa", "dinner with friends", "outing", "movie", "date"]

            if any(w in title_lower for w in excited_triggers):
                suggested_mood = "excited"
                mood_reason = "Celebratory or high-energy event"
            elif any(w in title_lower for w in stressed_triggers):
                suggested_mood = "stressed"
                mood_reason = "Urgent, corrective, or stressful expense"
            elif any(w in title_lower for w in sad_triggers):
                suggested_mood = "sad"
                mood_reason = "Comfort or emotional expense"
            elif any(w in title_lower for w in happy_triggers):
                suggested_mood = "happy"
                mood_reason = "Joyful personal reward"

        conf = 0.95 if direct_user_cat else (0.88 if matched_keyword else 0.65)

        return SuggestCategoryResponse(
            suggested_category=final_category,
            confidence=conf,
            suggested_payment_mode=suggested_mode,
            suggested_mood=suggested_mood,
            mood_reason=mood_reason,
            reasoning=reason,
        )

    async def scan_receipt(
        self,
        image_bytes: bytes,
        mime_type: str,
        available_categories: list[str],
    ) -> ScanReceiptResponse:
        """
        The Rules Provider has no vision capability.
        Returns a descriptive placeholder informing the user that a vision-capable
        AI provider (Gemini, OpenAI, or Anthropic) is required for real receipt parsing.
        """
        cat = available_categories[0] if available_categories else "General"
        return ScanReceiptResponse(
            title="Receipt Scan Unavailable",
            amount=None,
            date=date.today().isoformat(),
            category=cat,
            payment_mode=None,
            mood=None,
            mood_reason=None,
            confidence=0.0,
            notes="Vision-based receipt scanning requires an AI provider with image understanding (Gemini, OpenAI, or Anthropic). Configure AI_PROVIDER and the corresponding API key in your environment to enable this feature.",
        )

    async def suggest_budget(
        self,
        monthly_spend: float,
        daily_avg: float,
        top_categories: list[dict],
    ) -> SuggestBudgetResponse:
        base_target = monthly_spend if monthly_spend > 0 else (daily_avg * 30 if daily_avg > 0 else 30000.0)
        recommended_monthly = max(round(base_target * 1.10, -2), 100.0)
        daily_calc = recommended_monthly / 30.0
        recommended_daily = round(daily_calc, -1) if daily_calc >= 20.0 else round(daily_calc, 2)
        recommended_daily = max(recommended_daily, 1.0)

        if monthly_spend > 0:
            rationale = (
                f"Based on your current monthly spend of ₹{monthly_spend:,.0f}, "
                f"a target of ₹{recommended_monthly:,.0f} with a ₹{recommended_daily:,.0f}/day cap "
                f"provides spending flexibility while targeting an estimated 15% savings rate."
            )
        else:
            rationale = (
                f"Recommended baseline target of ₹{recommended_monthly:,.0f}/month with a ₹{recommended_daily:,.0f}/day cap "
                f"to establish disciplined spending habits and build a consistent 15% savings buffer."
            )

        return SuggestBudgetResponse(
            recommended_monthly_limit=recommended_monthly,
            recommended_daily_limit=recommended_daily,
            estimated_savings_rate=15.0,
            rationale=rationale,
        )

    async def chat(
        self,
        messages: list[ChatMessage],
        financial_context: dict,
    ) -> ChatResponse:
        import re

        user_query = messages[-1].content.strip() if messages else "Hello"
        q_lower = user_query.lower()

        sym = financial_context.get("currency_symbol", "₹")
        total_spent = float(financial_context.get("total_spent", 0.0) or 0.0)
        monthly_budget = financial_context.get("monthly_budget")
        remaining_budget = financial_context.get("remaining_budget")
        daily_average = float(financial_context.get("daily_average", 0.0) or 0.0)
        top_cats = financial_context.get("top_categories", [])
        user_name = financial_context.get("user_name", "Friend")

        # Multilingual language detection
        def detect_lang(text: str) -> str:
            t = text.lower()
            mr_words = [
                "karu shakto", "karu shakte", "gheu shakto", "gheu shakte", "parvadel",
                "kuthe", "kashat", "kashavar", "paise", "kharch", "tota", "toota", "bachat",
                "shillak", "mazya", "majhe", "mala", "aani", "shakto", "shakte", "aahe", "nahi",
                "करू", "शकतो", "शकते", "कुठे", "पैसे", "खर्च", "तोटा", "बचत", "शिल्लक", "परवडेल"
            ]
            if any(w in t for w in mr_words):
                return "mr"

            hi_words = [
                "kar sakta", "kar sakti", "kar sakte", "le sakta", "le sakti", "khareed",
                "kahan", "kaha gaye", "kidhar", "ghata", "nuksan", "bachaye", "mera", "meri",
                "सकता", "सकती", "खरीद", "कहाँ", "घाटा", "नुकसान", "बचत", "कितना"
            ]
            if any(w in t for w in hi_words):
                return "hi"

            if re.search(r"[\u0900-\u097F]", text):
                if any(c in text for c in ["ळ", "ऱ", "आहे", "नाही", "माझे"]):
                    return "mr"
                return "hi"

            return "en"

        lang = detect_lang(user_query)

        # 1. Affordability Check ("Can I afford X" / "मी X खर्च करू शकतो का?")
        afford_triggers_en = ["afford", "can i buy", "can i spend", "should i buy", "can i purchase"]
        afford_triggers_mr = [
            "karu shakto", "karu shakte", "gheu shakto", "gheu shakte", "parvadel",
            "kharch karu", "dinner karu", "kharidi karu", "shakto ka", "shakte ka",
            "करू शकतो", "करू शकते", "घेऊ शकतो", "परवडेल", "खर्च करू"
        ]
        afford_triggers_hi = [
            "kar sakta", "kar sakti", "kar sakte", "le sakta", "le sakti", "khareed sakta",
            "कर सकता", "कर सकती", "ले सकता", "खरीद सकता"
        ]

        is_afford = (
            any(w in q_lower for w in afford_triggers_en)
            or any(w in q_lower for w in afford_triggers_mr)
            or any(w in q_lower for w in afford_triggers_hi)
        )

        if is_afford:
            numbers = re.findall(r"\d+(?:,\d+)*(?:\.\d+)?", user_query.replace(sym, "").replace(",", ""))
            amount = float(numbers[0]) if numbers else None

            if amount is not None:
                if remaining_budget is not None and remaining_budget < 0:
                    deficit = abs(remaining_budget)
                    new_def = deficit + amount
                    if lang == "mr":
                        reply = (
                            f"⚠️ **तोटा इशारा**: तुम्ही आधीच **{sym}{deficit:,.2f}** च्या तोट्यात आहात. "
                            f"आणखी **{sym}{amount:,.2f}** खर्च केल्यास तुमचा तोटा वाढून **{sym}{new_def:,.2f}** होईल. "
                            f"पुढील महिन्यापर्यंत हा खर्च पुढे ढकलण्याचा सल्ला मी देईन."
                        )
                    elif lang == "hi":
                        reply = (
                            f"⚠️ **घाटा अलर्ट**: आप पहले से ही **{sym}{deficit:,.2f}** के घाटे (deficit) में हैं। "
                            f"और **{sym}{amount:,.2f}** खर्च करने पर आपका कुल घाटा **{sym}{new_def:,.2f}** हो जाएगा। "
                            f"यह खरीदारी अगले महीने तक टालने की सलाह दी जाती है।"
                        )
                    else:
                        reply = (
                            f"⚠️ You are currently in a monthly deficit of **{sym}{deficit:,.2f}**. "
                            f"Spending another **{sym}{amount:,.2f}** would increase your deficit to **{sym}{new_def:,.2f}**. "
                            f"I recommend postponing this purchase until next month's budget resets."
                        )
                elif remaining_budget is not None:
                    if amount <= remaining_budget:
                        new_rem = remaining_budget - amount
                        if lang == "mr":
                            reply = (
                                f"✅ **होय, तुम्हाला परवडेल!** तुम्ही **{sym}{amount:,.2f}** खर्च करू शकता. "
                                f"तुमच्या चालू महिन्याच्या बजेटमध्ये सध्या **{sym}{remaining_budget:,.2f}** शिल्लक आहेत. "
                                f"या खर्चानंतर तुमच्याकडे **{sym}{new_rem:,.2f}** शिल्लक राहतील."
                            )
                        elif lang == "hi":
                            reply = (
                                f"✅ **हाँ, आप यह खर्च कर सकते हैं!** आपके पास इस महीने के बजट में **{sym}{remaining_budget:,.2f}** बचे हैं। "
                                f"**{sym}{amount:,.2f}** खर्च करने के बाद आपके पास **{sym}{new_rem:,.2f}** शेष बचेंगे।"
                            )
                        else:
                            reply = (
                                f"✅ Yes, you can afford **{sym}{amount:,.2f}**! "
                                f"You currently have **{sym}{remaining_budget:,.2f}** remaining in your monthly budget. "
                                f"After this purchase, your remaining balance will be **{sym}{new_rem:,.2f}**."
                            )
                    else:
                        shortfall = amount - remaining_budget
                        if lang == "mr":
                            reply = (
                                f"⚠️ **सावधान**: तुमच्याकडे या महिन्यात फक्त **{sym}{remaining_budget:,.2f}** शिल्लक आहेत. "
                                f"**{sym}{amount:,.2f}** खर्च केल्यास तुम्ही **{sym}{shortfall:,.2f}** च्या तोट्यात (deficit) जाल. "
                                f"हा खर्च कमी करण्याचा किंवा पुढे ढकलण्याचा विचार करा."
                            )
                        elif lang == "hi":
                            reply = (
                                f"⚠️ **सावधानी**: आपके पास इस महीने सिर्फ **{sym}{remaining_budget:,.2f}** बचे हैं। "
                                f"**{sym}{amount:,.2f}** खर्च करने से आप **{sym}{shortfall:,.2f}** के घाटे में चले जाएंगे।"
                            )
                        else:
                            reply = (
                                f"⚠️ Caution: You only have **{sym}{remaining_budget:,.2f}** remaining this month. "
                                f"Spending **{sym}{amount:,.2f}** would push you into a deficit of **{sym}{shortfall:,.2f}**. "
                                f"Consider finding a lower-cost option or deferring this purchase."
                            )
                else:
                    if lang == "mr":
                        reply = (
                            f"तुम्ही अजून मासिक बजेट सेट केलेले नाही! तुमचा या महिन्याचा एकूण खर्च **{sym}{total_spent:,.2f}** आहे. "
                            f"परवडण्याची अचूक तपासणी करण्यासाठी कृपया बजेट पृष्ठावर जाऊन मासिक मर्यादा सेट करा."
                        )
                    elif lang == "hi":
                        reply = (
                            f"आपने अभी तक मासिक बजट सेट नहीं किया है! आपका इस महीने का खर्च **{sym}{total_spent:,.2f}** है। "
                            f"सटीक सलाह के लिए कृपया मासिक बजट सेट करें।"
                        )
                    else:
                        reply = (
                            f"You haven't set a monthly budget limit yet! Your total spending so far is **{sym}{total_spent:,.2f}**. "
                            f"Setting a monthly budget will allow me to track affordability precisely."
                        )
            else:
                rem_str = f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"
                if lang == "mr":
                    reply = f"परवडण्याची तपासणी करण्यासाठी रक्कम सांगा (उदा. 'मी ₹3,000 चा डिनर करू शकतो का?'). शिल्लक बजेट: **{rem_str}**."
                elif lang == "hi":
                    reply = f"परवडने की जांच के लिए कृपया राशि बताएं (उदा. 'क्या मैं ₹3,000 खर्च कर सकता हूँ?'). बचा हुआ बजट: **{rem_str}**."
                else:
                    reply = f"To check affordability, let me know the amount! Your remaining monthly budget is currently **{rem_str}**."

            actions = (
                ["माझे पैसे कुठे जात आहेत?", "शिल्लक बजेट किती आहे?", "बचत कशी करावी?"]
                if lang == "mr"
                else ["कहाँ ज्यादा खर्च हो रहा है?", "मेरा बचा हुआ बजट कितना है?", "बचत के उपाय"]
                if lang == "hi"
                else ["What is my remaining budget?", "Where is most of my money going?", "How to avoid deficit?"]
            )
            return ChatResponse(
                reply=reply,
                suggested_actions=actions,
                provider=self.provider_name,
                model=self.default_model,
            )

        # 2. Spending Breakdown / Category queries ("Where is my money going?" / "माझे पैसे कुठे खर्च झाले?")
        breakdown_triggers = [
            "where", "going", "category", "breakdown",
            "kuthe", "kashavar", "kashat", "sarvat jast", "कुठे", "पैसे कुठे",
            "kahan", "kaha", "kidhar", "sabse jyada", "कहाँ", "कहाँ खर्च"
        ]
        has_cat_match = any(
            cat.get("name", "").lower() in q_lower for cat in top_cats if cat.get("name")
        )
        if any(w in q_lower for w in breakdown_triggers) or has_cat_match:
            top_cat_name = top_cats[0].get("name", "General") if top_cats else "None"
            top_cat_amt = float(top_cats[0].get("amount", 0.0)) if top_cats else 0.0
            top_pct = (top_cat_amt / total_spent * 100) if total_spent > 0 else 0

            if lang == "mr":
                reply = (
                    f"📊 **तुमच्या खर्चाचा थेट तपशील:**\n\n"
                    f"- **एकूण चालू महिना खर्च**: **{sym}{total_spent:,.2f}**\n"
                    f"- **सर्वाधिक खर्च श्रेणी**: **{top_cat_name}** (**{sym}{top_cat_amt:,.2f}**, {top_pct:.1f}%)\n"
                    f"- **दैनिक सरासरी खर्च**: **{sym}{daily_average:,.2f}/दिवस**\n\n"
                    f"तुमच्या बजेटवर सर्वात जास्त भार **{top_cat_name}** मुळे पडत आहे."
                )
                actions = ["मी ₹3,000 खर्च करू शकतो का?", "बचत कशी करावी?", "तोटा कसा टाळायचा?"]
            elif lang == "hi":
                reply = (
                    f"📊 **आपके खर्च का लाइव विवरण:**\n\n"
                    f"- **इस महीने का कुल खर्च**: **{sym}{total_spent:,.2f}**\n"
                    f"- **सबसे ज्यादा खर्च**: **{top_cat_name}** (**{sym}{top_cat_amt:,.2f}**, {top_pct:.1f}%)\n"
                    f"- **दैनिक औसत खर्च**: **{sym}{daily_average:,.2f}/दिन**\n\n"
                    f"आपके खर्च का बड़ा हिस्सा **{top_cat_name}** में जा रहा है।"
                )
                actions = ["क्या मैं ₹3,000 खर्च कर सकता हूँ?", "बचत के उपाय", "घाटा कैसे रोकें?"]
            else:
                reply = (
                    f"📊 **Live Spending Breakdown:**\n\n"
                    f"- **Total Spent This Month**: **{sym}{total_spent:,.2f}**\n"
                    f"- **Highest Category**: **{top_cat_name}** (**{sym}{top_cat_amt:,.2f}**, {top_pct:.1f}%)\n"
                    f"- **Daily Burn Rate**: **{sym}{daily_average:,.2f}/day**\n\n"
                    f"Most of your spending is concentrated in **{top_cat_name}**."
                )
                actions = ["Can I afford a ₹3,000 purchase?", "How can I save more?", "How to avoid deficit?"]

            return ChatResponse(
                reply=reply,
                suggested_actions=actions,
                provider=self.provider_name,
                model=self.default_model,
            )

        # 3. Deficit / Over Budget recovery queries
        deficit_triggers = [
            "deficit", "over budget", "debt", "recover",
            "tota", "toota", "sampla", "bharun", "cross", "तोटा", "भरून",
            "ghata", "nuksan", "khatam", "घाटा", "नुकसान"
        ]
        if any(w in q_lower for w in deficit_triggers):
            if remaining_budget is not None and remaining_budget < 0:
                deficit = abs(remaining_budget)
                if lang == "mr":
                    reply = (
                        f"⚠️ **मासिक तोटा इशारा**: तुम्ही बजेट **{sym}{deficit:,.2f}** ने ओलांडले आहे.\n\n"
                        f"**तोटा भरून काढण्याची 3-सूत्री योजना:**\n"
                        f"1. **अनावश्यक खर्च थांबवा**: बाहेर खाणे आणि शॉपिंग तात्पुरती स्थगित करा.\n"
                        f"2. **प्रत्येक खर्च नोंदवा**: UPI व लहान स्नॅक्स खर्चान कडे विशेष लक्ष द्या.\n"
                        f"3. **AI बजेट स्वीकारा**: Budgets पृष्ठावर जाऊन वास्तववादी AI बजेट मर्यादा लागू करा."
                    )
                    actions = ["माझे पैसे कुठे जात आहेत?", "मी ₹1,000 खर्च करू शकतो का?", "बचत कशी करावी?"]
                elif lang == "hi":
                    reply = (
                        f"⚠️ **मासिक घाटा अलर्ट**: आप अपने बजट से **{sym}{deficit:,.2f}** आगे निकल चुके हैं।\n\n"
                        f"**घाटा नियंत्रण के 3 कदम:**\n"
                        f"1. **गैर-जरूरी खर्च रोकें**: रेस्टोरेंट और शॉपिंग पर कुछ दिन रोक लगाएं।\n"
                        f"2. **हर भुगतान ट्रैक करें**: छोटे UPI भुगतानों को तुरंत नोट करें।\n"
                        f"3. **नया बजट बनाएं**: Budgets पेज पर AI सुझाए बजट को अपनाएं।"
                    )
                    actions = ["कहाँ ज्यादा खर्च हो रहा है?", "क्या मैं ₹1,000 खर्च कर सकता हूँ?", "बचत के उपाय"]
                else:
                    reply = (
                        f"⚠️ **Monthly Deficit Alert**: You have exceeded your budget by **{sym}{deficit:,.2f}**.\n\n"
                        f"**3-Step Recovery Plan:**\n"
                        f"1. **Pause Discretionary Spending**: Avoid dining out and retail for the remainder of the month.\n"
                        f"2. **Log Every Penny**: Catch hidden leakages via UPI and small snacks.\n"
                        f"3. **Adjust Next Month**: Use the AI Budget Advisor on the Budgets page to set a realistic limit."
                    )
                    actions = ["What is my remaining budget?", "Where am I spending the most?", "Adopt AI Budget"]
            else:
                rem = f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"
                if lang == "mr":
                    reply = f"🎉 आनंदाची बातमी! तुम्ही **तोट्यात नाही आहात**. तुमच्या बजेटमध्ये अजून **{rem}** शिल्लक आहेत."
                    actions = ["मी ₹3,000 खर्च करू शकतो का?", "माझे पैसे कुठे जात आहेत?", "बचत कशी करावी?"]
                elif lang == "hi":
                    reply = f"🎉 अच्छी खबर! आप **घाटे में नहीं हैं**। आपके बजट में अभी **{rem}** शेष हैं।"
                    actions = ["क्या मैं ₹3,000 खर्च कर सकता हूँ?", "कहाँ ज्यादा खर्च हो रहा है?", "बचत के उपाय"]
                else:
                    reply = f"🎉 Great news! You are **not in a deficit**. You have **{rem}** remaining in your budget."
                    actions = ["What is my remaining budget?", "Where am I spending the most?", "Tips to save more"]

            return ChatResponse(
                reply=reply,
                suggested_actions=actions,
                provider=self.provider_name,
                model=self.default_model,
            )

        # 4. Savings advice queries
        saving_triggers = [
            "save", "saving", "tip", "reduce", "plan", "advice",
            "bachat", "salla", "madat", "बचत", "सल्ला",
            "bachaye", "सलाह"
        ]
        if any(w in q_lower for w in saving_triggers):
            top_cat_name = top_cats[0].get("name", "Expenses") if top_cats else "Discretionary items"
            if lang == "mr":
                reply = (
                    f"💡 **{user_name} साठी वैयक्तिक बचत सल्ला:**\n\n"
                    f"- **{top_cat_name} वर नियंत्रण**: हा तुमचा सर्वाधिक खर्च आहे. यात 10-15% कपात केल्यास लगेच बचत होईल.\n"
                    f"- **50/30/20 नियमाचा वापर करा**: 50% गरजा, 30% इच्छा आणि 20% थेट बचतीमध्ये ठेवा.\n"
                    f"- **दैनिक खर्च गती**: तुम्ही सरासरी **{sym}{daily_average:,.2f}/दिवस** खर्च करत आहात."
                )
                actions = ["मी ₹1,500 खर्च करू शकतो का?", "माझे पैसे कुठे जात आहेत?", "शिल्लक बजेट किती आहे?"]
            elif lang == "hi":
                reply = (
                    f"💡 **{user_name} के लिए स्मार्ट बचत रणनीति:**\n\n"
                    f"- **{top_cat_name} में कटौती**: यह आपका सबसे बड़ा खर्च है। इसमें 10-15% कटौती से सीधी बचत होगी।\n"
                    f"- **50/30/20 नियम अपनाएं**: 50% जरूरतें, 30% शौक, और 20% सीधी बचत।\n"
                    f"- **दैनिक खर्च दर**: आप प्रतिदिन औसतन **{sym}{daily_average:,.2f}** खर्च कर रहे हैं।"
                )
                actions = ["क्या मैं ₹1,500 खर्च कर सकता हूँ?", "कहाँ ज्यादा खर्च हो रहा है?", "बचा हुआ बजट कितना है?"]
            else:
                reply = (
                    f"💡 **Personalized Savings Strategy for {user_name}:**\n\n"
                    f"- **Trim {top_cat_name}**: This is your highest expenditure this month. Reducing it by just 10-15% will yield immediate savings.\n"
                    f"- **Follow the 50/30/20 Rule**: 50% for Needs, 30% for Wants, and 20% directly into Savings.\n"
                    f"- **Current Spending Velocity**: You are spending an average of **{sym}{daily_average:,.2f}/day**."
                )
                actions = ["Can I afford ₹1,500?", "What is my top category?", "How much did I spend this month?"]

            return ChatResponse(
                reply=reply,
                suggested_actions=actions,
                provider=self.provider_name,
                model=self.default_model,
            )

        # 5. Default / Snapshot Greeting in detected language
        budget_str = f"{sym}{monthly_budget:,.2f}" if monthly_budget else ("सेट नाही" if lang == "mr" else "सेट नहीं" if lang == "hi" else "Not set")
        rem_str = f"{sym}{remaining_budget:,.2f}" if remaining_budget is not None else "N/A"
        top_cat_str = top_cats[0].get("name", "None") if top_cats else "None"

        if lang == "mr":
            reply = (
                f"नमस्कार {user_name}! हा तुमचा थेट आर्थिक गोषवारा आहे:\n\n"
                f"- **एकूण खर्च**: {sym}{total_spent:,.2f}\n"
                f"- **मासिक बजेट**: {budget_str}\n"
                f"- **शिल्लक रक्कम**: {rem_str}\n"
                f"- **मुख्य श्रेणी**: {top_cat_str}\n\n"
                f"मी तुम्हाला आर्थिक नियोजनात कशी मदत करू शकतो? तुम्ही मला विचारू शकता:\n"
                f"- *'मी आज रात्री ₹3,000 चा डिनर करू शकतो का?'*\n"
                f"- *'माझे पैसे कुठे खर्च होत आहेत?'*\n"
                f"- *'मी या महिन्यात बचत कशी करावी?'*"
            )
            actions = ["मी ₹3,000 खर्च करू शकतो का?", "माझे पैसे कुठे जात आहेत?", "बचत कशी करावी?"]
        elif lang == "hi":
            reply = (
                f"नमस्ते {user_name}! यह आपका लाइव वित्तीय सारांश है:\n\n"
                f"- **कुल खर्च**: {sym}{total_spent:,.2f}\n"
                f"- **मासिक बजट**: {budget_str}\n"
                f"- **बची हुई राशि**: {rem_str}\n"
                f"- **प्रमुख श्रेणी**: {top_cat_str}\n\n"
                f"मैं आपके बजट प्रबंधन में कैसे मदद कर सकता हूँ? आप पूछ सकते हैं:\n"
                f"- *'क्या मैं आज ₹3,000 खर्च कर सकता हूँ?'*\n"
                f"- *'मेरा पैसा कहाँ खर्च हो रहा है?'*\n"
                f"- *'मैं ज्यादा बचत कैसे करूँ?'*"
            )
            actions = ["क्या मैं ₹3,000 खर्च कर सकता हूँ?", "कहाँ ज्यादा खर्च हो रहा है?", "बचत कैसे करें?"]
        else:
            reply = (
                f"Hello {user_name}! Here is your real-time financial snapshot:\n\n"
                f"- **Total Spent**: {sym}{total_spent:,.2f}\n"
                f"- **Monthly Budget**: {budget_str}\n"
                f"- **Remaining Balance**: {rem_str}\n"
                f"- **Top Category**: {top_cat_str}\n\n"
                f"How can I help you manage your money today? You can ask me things like:\n"
                f"- *'Can I afford a {sym}3,000 dinner tonight?'*\n"
                f"- *'Where am I spending the most money?'*\n"
                f"- *'How can I save more this month?'*"
            )
            actions = [f"Can I afford {sym}3,000?", "Where is my money going?", "Tips to save more"]

        return ChatResponse(
            reply=reply,
            suggested_actions=actions,
            provider=self.provider_name,
            model=self.default_model,
        )

    async def generate_emotional_insights(
        self,
        user_name: str,
        currency_symbol: str,
        mood_breakdown: list[dict],
        impulse_data: dict,
        dominant_triggers: list[dict],
    ) -> list[EmotionalAIAdvice]:
        sym = currency_symbol or "₹"
        insights: list[EmotionalAIAdvice] = []

        mood_map = {m.get("mood"): m for m in mood_breakdown}
        stressed = mood_map.get("stressed")
        excited = mood_map.get("excited")
        sad = mood_map.get("sad")
        happy = mood_map.get("happy")

        # 1. Stressed Spending Trigger
        if stressed and stressed.get("total_amount", 0) > 0:
            s_amt = stressed.get("total_amount", 0)
            dom_cat = stressed.get("dominant_category") or "discretionary items"
            pct = stressed.get("percentage", 0)
            insights.append(
                EmotionalAIAdvice(
                    id="emotion-stressed-trigger",
                    title="Stress-Induced Spending Detected",
                    message=(
                        f"You spent {sym}{s_amt:,.2f} ({pct:.0f}% of tracked mood spend) while stressed, "
                        f"concentrated in {dom_cat}. Applying a 24-hour pause when feeling overwhelmed can safeguard your monthly budget."
                    ),
                    severity="warning" if pct >= 25 else "info",
                    icon="alert-triangle",
                )
            )

        # 2. Impulse & Excitement Pattern
        impulse_amt = impulse_data.get("total_impulse_amount", 0)
        impulse_count = impulse_data.get("flagged_transactions_count", 0)
        if impulse_amt > 0:
            insights.append(
                EmotionalAIAdvice(
                    id="emotion-impulse-surge",
                    title="Impulse Spending Alert",
                    message=(
                        f"Detected {impulse_count} high-ticket impulse transactions totaling {sym}{impulse_amt:,.2f}. "
                        f"These occurred during heightened emotional moments. Setting a hard ₹1,000 threshold for unplanned buys protects against regret."
                    ),
                    severity="warning",
                    icon="flame",
                )
            )
        elif excited and excited.get("total_amount", 0) > 0:
            e_amt = excited.get("total_amount", 0)
            insights.append(
                EmotionalAIAdvice(
                    id="emotion-excited-spree",
                    title="Celebratory Spending Discipline",
                    message=(
                        f"You celebrated with {sym}{e_amt:,.2f} spent in an excited state. "
                        f"Allocating a dedicated 'Guilt-Free Fun' envelope keeps excitement rewarding without derailing savings."
                    ),
                    severity="opportunity",
                    icon="sparkles",
                )
            )

        # 3. Sad / Retail Therapy
        if sad and sad.get("total_amount", 0) > 0:
            sad_amt = sad.get("total_amount", 0)
            insights.append(
                EmotionalAIAdvice(
                    id="emotion-retail-therapy",
                    title="Retail Therapy Check-In",
                    message=(
                        f"You logged {sym}{sad_amt:,.2f} while feeling down. "
                        f"Remember that shopping provides temporary dopamine; experimenting with no-spend mood boosters (music, friends) builds lasting peace of mind."
                    ),
                    severity="info",
                    icon="heart",
                )
            )

        # 4. Mindful / Happy default
        if len(insights) < 2:
            happy_amt = happy.get("total_amount", 0) if happy else 0
            insights.append(
                EmotionalAIAdvice(
                    id="emotion-mindful-baseline",
                    title="Emotionally Mindful Spending",
                    message=(
                        f"Great emotional balance, {user_name}! Tagging expenses by emotion reveals subconscious financial habits and prevents impulsive deficit triggers."
                    ),
                    severity="opportunity",
                    icon="sparkles",
                )
            )

        return insights[:3]


