"""
Tests for Duplicate Transaction Guard (Feature 21).

Verifies:
- Detection of exact matches within ±2 days window.
- Detection of similar/fuzzy title matches within ±2 days window.
- Non-duplicate scenarios (amounts differ, outside ±2 days, self-exclusion on edit).
"""
import random
import uuid
import pytest
from fastapi.testclient import TestClient
from tests.test_expenses import helper_create_category

BASE_URL = "/api/v1/expenses"
CHECK_URL = "/api/v1/expenses/check-duplicate"


def get_unique_amount() -> float:
    return round(float(random.randint(100000, 900000)) / 100.0, 2)


def test_exact_duplicate_same_day(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    title = f"Starbucks Coffee {suffix}"
    amount = get_unique_amount()
    cat_id = helper_create_category(client)
    res_create = client.post(BASE_URL, json={
        "title": title,
        "amount": amount,
        "category_id": cat_id,
        "date": "2025-02-10"
    })
    assert res_create.status_code == 201
    exp_id = res_create.json()["data"]["id"]

    try:
        # Check duplicate on same date, same amount, same title
        res_check = client.post(CHECK_URL, json={
            "title": title,
            "amount": amount,
            "date": "2025-02-10"
        })
        assert res_check.status_code == 200
        data = res_check.json()["data"]
        assert data["is_duplicate"] is True
        assert data["match_type"] == "exact"
        assert data["days_difference"] == 0
        assert "on the same day" in data["message"]
    finally:
        client.delete(f"{BASE_URL}/{exp_id}")


def test_duplicate_within_plus_minus_2_days(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    title = f"Uber Ride {suffix}"
    amount = get_unique_amount()
    cat_id = helper_create_category(client)
    res_create = client.post(BASE_URL, json={
        "title": title,
        "amount": amount,
        "category_id": cat_id,
        "date": "2025-02-10"
    })
    assert res_create.status_code == 201
    exp_id = res_create.json()["data"]["id"]

    try:
        # Check 1 day later (2025-02-11) -> existing expense was yesterday (1 day earlier)
        res_next_day = client.post(CHECK_URL, json={
            "title": title,
            "amount": amount,
            "date": "2025-02-11"
        })
        assert res_next_day.status_code == 200
        data = res_next_day.json()["data"]
        assert data["is_duplicate"] is True
        assert data["days_difference"] == 1
        assert "yesterday" in data["message"]

        # Check 2 days earlier (2025-02-08) -> existing expense is 2 days later (-2)
        res_earlier = client.post(CHECK_URL, json={
            "title": title,
            "amount": amount,
            "date": "2025-02-08"
        })
        assert res_earlier.status_code == 200
        assert res_earlier.json()["data"]["is_duplicate"] is True
        assert res_earlier.json()["data"]["days_difference"] == -2
        assert "2 days later" in res_earlier.json()["data"]["message"]
    finally:
        client.delete(f"{BASE_URL}/{exp_id}")


def test_no_duplicate_outside_window(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    title = f"Zomato Dinner {suffix}"
    amount = get_unique_amount()
    cat_id = helper_create_category(client)
    res_create = client.post(BASE_URL, json={
        "title": title,
        "amount": amount,
        "category_id": cat_id,
        "date": "2025-02-10"
    })
    assert res_create.status_code == 201
    exp_id = res_create.json()["data"]["id"]

    try:
        # Check 3 days later (2025-02-13)
        res_outside = client.post(CHECK_URL, json={
            "title": title,
            "amount": amount,
            "date": "2025-02-13"
        })
        assert res_outside.status_code == 200
        assert res_outside.json()["data"]["is_duplicate"] is False
    finally:
        client.delete(f"{BASE_URL}/{exp_id}")


def test_no_duplicate_different_amount(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    title = f"Airtel Bill {suffix}"
    amount = get_unique_amount()
    cat_id = helper_create_category(client)
    res_create = client.post(BASE_URL, json={
        "title": title,
        "amount": amount,
        "category_id": cat_id,
        "date": "2025-02-10"
    })
    assert res_create.status_code == 201
    exp_id = res_create.json()["data"]["id"]

    try:
        # Same title and date, but different amount
        res_check = client.post(CHECK_URL, json={
            "title": title,
            "amount": round(amount + 10.0, 2),
            "date": "2025-02-10"
        })
        assert res_check.status_code == 200
        assert res_check.json()["data"]["is_duplicate"] is False
    finally:
        client.delete(f"{BASE_URL}/{exp_id}")


def test_similar_title_substring_and_token_overlap(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    amount = get_unique_amount()
    cat_id = helper_create_category(client)
    res_create = client.post(BASE_URL, json={
        "title": f"DMart Weekly Groceries {suffix}",
        "amount": amount,
        "category_id": cat_id,
        "date": "2025-02-10"
    })
    assert res_create.status_code == 201
    exp_id = res_create.json()["data"]["id"]

    try:
        # Substring title
        res_check = client.post(CHECK_URL, json={
            "title": f"DMart Groceries {suffix}",
            "amount": amount,
            "date": "2025-02-11"
        })
        assert res_check.status_code == 200
        data = res_check.json()["data"]
        assert data["is_duplicate"] is True
        assert data["match_type"] == "similar"
    finally:
        client.delete(f"{BASE_URL}/{exp_id}")


def test_exclude_id_on_edit(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    amount = get_unique_amount()
    cat_id = helper_create_category(client)
    title = f"Exclusive Gym {suffix}"
    res_create = client.post(BASE_URL, json={
        "title": title,
        "amount": amount,
        "category_id": cat_id,
        "date": "2025-02-10"
    })
    assert res_create.status_code == 201
    expense_id = res_create.json()["data"]["id"]

    try:
        # When editing the expense, passing exclude_id should not warn on itself
        res_check = client.post(CHECK_URL, json={
            "title": title,
            "amount": amount,
            "date": "2025-02-10",
            "exclude_id": expense_id
        })
        assert res_check.status_code == 200
        res_data = res_check.json()["data"]
        assert res_data["is_duplicate"] is False, f"Unexpected duplicate detected: {res_data}"
    finally:
        client.delete(f"{BASE_URL}/{expense_id}")
