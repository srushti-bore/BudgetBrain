"""
Tests for /api/v1/dashboard endpoints.

Covers: FR-17 to FR-25 (Summary, By-Category, Trend, Comparison, Top Categories).
"""
import pytest
from fastapi.testclient import TestClient


class TestDashboardSummary:
    def test_summary_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/summary")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        data = body["data"]
        assert "total_spent" in data
        assert "recent_expenses" in data
        assert "budget" in data



class TestDashboardByCategory:
    def test_by_category_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/by-category")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert isinstance(body["data"], list)


class TestDashboardTrend:
    def test_trend_daily_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/trend?group_by=day")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_trend_weekly_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/trend?group_by=week")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_trend_monthly_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/trend?group_by=month")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert isinstance(body["data"], list)


class TestDashboardComparison:
    def test_comparison_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/comparison")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        data = body["data"]
        assert "current_month_total" in data
        assert "previous_month_total" in data


class TestDashboardTopCategories:
    def test_top_categories_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/top-categories?limit=5")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert isinstance(body["data"], list)


class TestEmotionalSpending:
    def test_emotional_spending_returns_200(self, client: TestClient):
        res = client.get("/api/v1/dashboard/emotional-spending")
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert "mood_breakdown" in data
        assert isinstance(data["mood_breakdown"], list)
        assert len(data["mood_breakdown"]) == 5  # happy, normal, sad, stressed, excited
        assert "impulse_patterns" in data
        assert "ai_insights" in data
        assert isinstance(data["ai_insights"], list)


