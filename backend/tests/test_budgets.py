"""
Tests for /api/v1/budgets endpoints.

Covers: FR-26 (Set budget), FR-27 (Live balance), FR-28 (Near-limit alert).
"""
import datetime
import uuid
import pytest
from fastapi.testclient import TestClient

BASE_URL = "/api/v1/budgets"


def helper_create_category(client: TestClient, name: str = None) -> str:
    name = name or f"Cat_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/categories", json={"name": name})
    return res.json()["data"]["id"]


def random_period_start() -> str:
    year = 2030 + (hash(uuid.uuid4().hex) % 50)
    month = (hash(uuid.uuid4().hex) % 12) + 1
    return f"{year:04d}-{month:02d}-01"


class TestListBudgets:
    def test_list_returns_200(self, client: TestClient):
        res = client.get(BASE_URL)
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert "meta" in data


class TestCreateBudget:
    def test_create_overall_budget_returns_201(self, client: TestClient):
        period_start = random_period_start()

        res = client.post(BASE_URL, json={
            "category_id": None,
            "period_type": "monthly",
            "period_start": period_start,
            "limit_amount": 50000.00
        })
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["limit_amount"] == "50000.00"
        assert data["status"] == "on_track"

    def test_create_per_category_budget_returns_201(self, client: TestClient):
        cat_id = helper_create_category(client)
        period_start = random_period_start()

        res = client.post(BASE_URL, json={
            "category_id": cat_id,
            "period_type": "monthly",
            "period_start": period_start,
            "limit_amount": 10000.00
        })
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["category_id"] == cat_id
        assert data["limit_amount"] == "10000.00"

    def test_create_with_zero_limit_returns_422(self, client: TestClient):
        period_start = random_period_start()

        res = client.post(BASE_URL, json={
            "category_id": None,
            "period_type": "monthly",
            "period_start": period_start,
            "limit_amount": 0.00
        })
        assert res.status_code == 422


class TestUpdateBudget:
    def test_update_limit_returns_200(self, client: TestClient):
        period_start = random_period_start()
        cat_id = helper_create_category(client)
        create_res = client.post(BASE_URL, json={
            "category_id": cat_id,
            "period_type": "monthly",
            "period_start": period_start,
            "limit_amount": 15000.00
        })
        budget_id = create_res.json()["data"]["id"]

        update_res = client.patch(f"{BASE_URL}/{budget_id}", json={"limit_amount": 20000.00})
        assert update_res.status_code == 200
        assert update_res.json()["data"]["limit_amount"] == "20000.00"

    def test_update_daily_limit_returns_200(self, client: TestClient):
        period_start = random_period_start()
        create_res = client.post(BASE_URL, json={
            "category_id": None,
            "period_type": "monthly",
            "period_start": period_start,
            "limit_amount": 30000.00,
            "daily_limit": 1000.00
        })
        budget_id = create_res.json()["data"]["id"]

        update_res = client.patch(f"{BASE_URL}/{budget_id}", json={"daily_limit": 1500.00})
        assert update_res.status_code == 200
        data = update_res.json()["data"]
        assert data["daily_limit"] == "1500.00"

    def test_update_nonexistent_returns_404(self, client: TestClient):
        res = client.patch(f"{BASE_URL}/00000000-0000-0000-0000-000000000000", json={"limit_amount": 1000.00})
        assert res.status_code == 404
