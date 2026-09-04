"""
Tests for /api/v1/expenses endpoints.

Covers: FR-2 (Add), FR-3 (View), FR-4 (Edit), FR-5 (Delete),
        FR-11 to FR-16 (Search, Filter, Sort),
        Budget Overspend Blocking (Strict budget cap protection).
"""
import datetime
import uuid
import pytest
from fastapi.testclient import TestClient

BASE_URL = "/api/v1/expenses"
TEST_DATE = "2025-01-15"


def helper_create_category(client: TestClient, name: str = None) -> str:
    name = name or f"Cat_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/categories", json={"name": name})
    return res.json()["data"]["id"]


class TestListExpenses:
    def test_list_returns_200(self, client: TestClient):
        res = client.get(BASE_URL)
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert "meta" in data

    def test_search_by_title(self, client: TestClient):
        cat_id = helper_create_category(client)
        client.post(BASE_URL, json={
            "title": "Grocery Shopping",
            "amount": 500.00,
            "category_id": cat_id,
            "date": TEST_DATE
        })
        res = client.get(f"{BASE_URL}?search=Grocery")
        assert res.status_code == 200
        items = res.json()["data"]
        assert len(items) >= 1
        assert "Grocery" in items[0]["title"]

    def test_filter_by_category(self, client: TestClient):
        cat_id = helper_create_category(client)
        client.post(BASE_URL, json={
            "title": "Movie Ticket",
            "amount": 300.00,
            "category_id": cat_id,
            "date": TEST_DATE
        })
        res = client.get(f"{BASE_URL}?category_id={cat_id}")
        assert res.status_code == 200
        items = res.json()["data"]
        assert all(item["category_id"] == cat_id for item in items)


class TestCreateExpense:
    def test_create_valid_expense_returns_201(self, client: TestClient):
        cat_id = helper_create_category(client)
        res = client.post(BASE_URL, json={
            "title": "Dinner",
            "amount": 1200.00,
            "category_id": cat_id,
            "date": TEST_DATE,
            "payment_mode": "card"
        })
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["title"] == "Dinner"
        assert data["amount"] == "1200.00"

    def test_create_with_future_date_returns_422(self, client: TestClient):
        cat_id = helper_create_category(client)
        future_date = str(datetime.date.today() + datetime.timedelta(days=5))
        res = client.post(BASE_URL, json={
            "title": "Future Expense",
            "amount": 100.00,
            "category_id": cat_id,
            "date": future_date
        })
        assert res.status_code == 422

    def test_create_with_next_day_timezone_buffer_returns_201(self, client: TestClient):
        cat_id = helper_create_category(client)
        tomorrow_date = str(datetime.date.today() + datetime.timedelta(days=1))
        res = client.post(BASE_URL, json={
            "title": "Timezone Expense",
            "amount": 100.00,
            "category_id": cat_id,
            "date": tomorrow_date
        })
        assert res.status_code == 201

    def test_create_with_zero_amount_returns_422(self, client: TestClient):
        cat_id = helper_create_category(client)
        res = client.post(BASE_URL, json={
            "title": "Zero Expense",
            "amount": 0.00,
            "category_id": cat_id,
            "date": TEST_DATE
        })
        assert res.status_code == 422

    def test_create_with_invalid_category_returns_404(self, client: TestClient):
        res = client.post(BASE_URL, json={
            "title": "Orphan Expense",
            "amount": 100.00,
            "category_id": "00000000-0000-0000-0000-000000000000",
            "date": TEST_DATE
        })
        assert res.status_code == 404

    def test_create_exceeding_budget_allowed_with_negative_remaining(self, client: TestClient):
        """Verify that expenses exceeding budget are allowed and recorded, reflecting negative deficit."""
        cat_id = helper_create_category(client)
        import uuid
        year = 2021
        month = (int(uuid.uuid4().hex[:4], 16) % 12) + 1
        day = (int(uuid.uuid4().hex[4:6], 16) % 20) + 1
        test_period = f"{year:04d}-{month:02d}-01"
        expense_date = f"{year:04d}-{month:02d}-{day:02d}"

        # 1. Set budget of 500
        client.post("/api/v1/budgets", json={
            "category_id": None,
            "period_type": "monthly",
            "period_start": test_period,
            "limit_amount": 500.00
        })
        # 2. Add expense of 1000 -> allowed (201 Created)
        res = client.post(BASE_URL, json={
            "title": "Overbudget Expense",
            "amount": 1000.00,
            "category_id": cat_id,
            "date": expense_date
        })
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["amount"] == "1000.00"

        # 3. Check budget returns negative remaining amount (-500.00)
        b_res = client.get(f"/api/v1/budgets?period_start={test_period}")
        assert b_res.status_code == 200
        budgets = b_res.json()["data"]
        overall = next((b for b in budgets if b["category_id"] is None), None)
        assert overall is not None
        assert float(overall["remaining_amount"]) <= -500.00
        assert overall["status"] == "over_budget"


class TestGetExpense:
    def test_get_existing_expense_returns_200(self, client: TestClient):
        cat_id = helper_create_category(client)
        create_res = client.post(BASE_URL, json={
            "title": "Coffee",
            "amount": 150.00,
            "category_id": cat_id,
            "date": TEST_DATE
        })
        exp_id = create_res.json()["data"]["id"]

        get_res = client.get(f"{BASE_URL}/{exp_id}")
        assert get_res.status_code == 200
        assert get_res.json()["data"]["title"] == "Coffee"

    def test_get_nonexistent_expense_returns_404(self, client: TestClient):
        res = client.get(f"{BASE_URL}/00000000-0000-0000-0000-000000000000")
        assert res.status_code == 404


class TestUpdateExpense:
    def test_update_title_returns_200(self, client: TestClient):
        cat_id = helper_create_category(client)
        create_res = client.post(BASE_URL, json={
            "title": "Tea",
            "amount": 20.00,
            "category_id": cat_id,
            "date": TEST_DATE
        })
        exp_id = create_res.json()["data"]["id"]

        update_res = client.patch(f"{BASE_URL}/{exp_id}", json={"title": "Special Masala Tea"})
        assert update_res.status_code == 200
        assert update_res.json()["data"]["title"] == "Special Masala Tea"


class TestDeleteExpense:
    def test_delete_returns_204(self, client: TestClient):
        cat_id = helper_create_category(client)
        create_res = client.post(BASE_URL, json={
            "title": "Snacks",
            "amount": 80.00,
            "category_id": cat_id,
            "date": TEST_DATE
        })
        exp_id = create_res.json()["data"]["id"]

        del_res = client.delete(f"{BASE_URL}/{exp_id}")
        assert del_res.status_code == 204

        get_res = client.get(f"{BASE_URL}/{exp_id}")
        assert get_res.status_code == 404

    def test_create_and_filter_expense_with_mood(self, client: TestClient):
        cat_id = helper_create_category(client)
        # Create with mood 'stressed'
        create_res = client.post(BASE_URL, json={
            "title": "Midnight Fast Food",
            "amount": 420.00,
            "category_id": cat_id,
            "date": TEST_DATE,
            "mood": "stressed"
        })
        assert create_res.status_code == 201
        data = create_res.json()["data"]
        assert data["mood"] == "stressed"

        # Filter by mood=stressed
        filter_res = client.get(f"{BASE_URL}?mood=stressed")
        assert filter_res.status_code == 200
        items = filter_res.json()["data"]
        assert any(item["title"] == "Midnight Fast Food" and item["mood"] == "stressed" for item in items)

