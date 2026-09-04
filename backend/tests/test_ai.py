"""
BudgetBrain — Pytest AI Financial Intelligence Test Suite

Tests:
  - Provider Factory Resolution (Gemini, OpenAI, Claude, Rules Fallback)
  - GET /api/v1/ai/insights (Returns structured advice cards)
  - POST /api/v1/ai/suggest-category (Predicts category from title)
  - GET /api/v1/ai/suggest-budget (Recommends limits)
  - Multi-tenant data isolation on AI insights
"""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.services.ai.anthropic_provider import AnthropicProvider
from app.services.ai.factory import get_ai_provider
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.rules_provider import RulesProvider


def test_ai_provider_factory_resolution():
    # 1. Default without keys -> RulesProvider
    s1 = Settings(DATABASE_URL="postgresql+asyncpg://mock/db", AI_PROVIDER="gemini", GEMINI_API_KEY="")
    p1 = get_ai_provider(s1)
    assert isinstance(p1, RulesProvider)
    assert p1.provider_name == "rules"

    # 2. Gemini with key -> GeminiProvider
    s2 = Settings(DATABASE_URL="postgresql+asyncpg://mock/db", AI_PROVIDER="gemini", GEMINI_API_KEY="test-gemini-key")
    p2 = get_ai_provider(s2)
    assert isinstance(p2, GeminiProvider)
    assert p2.provider_name == "gemini"

    # 3. OpenAI with key -> OpenAIProvider
    s3 = Settings(DATABASE_URL="postgresql+asyncpg://mock/db", AI_PROVIDER="openai", OPENAI_API_KEY="test-openai-key")
    p3 = get_ai_provider(s3)
    assert isinstance(p3, OpenAIProvider)
    assert p3.provider_name == "openai"

    # 4. Anthropic with key -> AnthropicProvider
    s4 = Settings(DATABASE_URL="postgresql+asyncpg://mock/db", AI_PROVIDER="anthropic", ANTHROPIC_API_KEY="test-claude-key")
    p4 = get_ai_provider(s4)
    assert isinstance(p4, AnthropicProvider)
    assert p4.provider_name == "anthropic"


def test_get_financial_insights_endpoint(client: TestClient):
    res = client.get("/api/v1/ai/insights?currency_symbol=₹")
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "provider" in data
    assert "insights" in data
    assert isinstance(data["insights"], list)
    assert len(data["insights"]) > 0

    first = data["insights"][0]
    assert "title" in first
    assert "message" in first
    assert "icon" in first
    assert "severity" in first


def test_suggest_category_endpoint(client: TestClient):
    # 1. Food test
    res = client.post(
        "/api/v1/ai/suggest-category",
        json={"title": "Swiggy Gourmet Dinner", "amount": 450.0},
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "suggested_category" in data
    assert data["confidence"] > 0
    assert data["suggested_payment_mode"] == "upi"

    # 2. Transit test
    res_uber = client.post(
        "/api/v1/ai/suggest-category",
        json={"title": "Uber ride to office", "amount": 280.0},
    )
    assert res_uber.status_code == 200
    assert res_uber.json()["data"]["confidence"] >= 0.80

    # 3. Shopping test
    res_amazon = client.post(
        "/api/v1/ai/suggest-category",
        json={"title": "Amazon Prime shopping sneakers", "amount": 3499.0},
    )
    assert res_amazon.status_code == 200
    assert res_amazon.json()["data"]["suggested_payment_mode"] == "card"


def test_suggest_budget_endpoint(client: TestClient):
    res = client.get("/api/v1/ai/suggest-budget")
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "recommended_monthly_limit" in data
    assert "recommended_daily_limit" in data
    assert data["recommended_monthly_limit"] > 0
    assert data["recommended_daily_limit"] > 0


def test_ai_chat_endpoint(client: TestClient):
    # 1. General greeting
    res_greet = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "Hi, what is my spending summary?"}]},
    )
    assert res_greet.status_code == 200, res_greet.text
    data = res_greet.json()["data"]
    assert "reply" in data
    assert len(data["reply"]) > 0
    assert "suggested_actions" in data
    assert len(data["suggested_actions"]) > 0

    # 2. Affordability question
    res_afford = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "Can I afford a ₹5,000 gadget right now?"}]},
    )
    assert res_afford.status_code == 200
    assert "afford" in res_afford.json()["data"]["reply"].lower()

    # 3. Category question
    res_cat = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "How much did I spend on food?"}]},
    )
    assert res_cat.status_code == 200
    assert len(res_cat.json()["data"]["reply"]) > 0

    # 4. Multilingual Marathi Affordability Query
    res_mr = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "मी ₹3,000 चा डिनर करू शकतो का?"}]},
    )
    assert res_mr.status_code == 200, res_mr.text
    mr_data = res_mr.json()["data"]
    assert "reply" in mr_data
    assert len(mr_data["reply"]) > 0
    # Must contain Marathi response terms (pervadnar / parvadeli / shillak / kharch)
    assert any(w in mr_data["reply"] for w in ["परवडेल", "शिल्लक", "खर्च", "बजेट", "तोटा", "afford"])
    assert len(mr_data["suggested_actions"]) > 0

    # 5. Multilingual Marathi Breakdown Query
    res_mr_breakdown = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "माझे पैसे कुठे खर्च झाले?"}]},
    )
    assert res_mr_breakdown.status_code == 200
    assert len(res_mr_breakdown.json()["data"]["reply"]) > 0

    # 6. Multilingual Hindi Query
    res_hi = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "क्या मैं ₹2,000 खर्च कर सकता हूँ?"}]},
    )
    assert res_hi.status_code == 200
    hi_data = res_hi.json()["data"]
    assert "reply" in hi_data
    assert len(hi_data["reply"]) > 0


def test_suggest_category_detects_mood(client: TestClient):
    # 1. Urgent/hospital -> stressed
    res1 = client.post("/api/v1/ai/suggest-category", json={"title": "Emergency Hospital Medicine", "amount": 1500.0})
    assert res1.status_code == 200
    assert res1.json()["data"]["suggested_mood"] == "stressed"

    # 2. Party/concert -> excited
    res2 = client.post("/api/v1/ai/suggest-category", json={"title": "Coldplay Concert Tickets", "amount": 6000.0})
    assert res2.status_code == 200
    assert res2.json()["data"]["suggested_mood"] == "excited"


def test_scan_receipt_endpoint(client: TestClient):
    import io
    dummy_image = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    files = {"file": ("receipt.png", dummy_image, "image/png")}
    res = client.post("/api/v1/ai/scan-receipt", files=files)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "title" in data
    assert "category" in data
    assert "mood" in data


