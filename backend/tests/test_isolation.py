"""
BudgetBrain — Pytest Multi-Tenant Data Isolation Test Suite

Verifies:
  - User A and User B cannot see each other's expenses
  - User B cannot view, modify, or delete User A's expense by ID (404)
  - User B cannot delete User A's category by ID (404)
  - User A and User B can have identical category names without collision
  - Dashboard analytics are completely isolated between users
"""

from datetime import datetime, timezone
import uuid
import pytest
from fastapi.testclient import TestClient
from app.core.security import create_verification_token


def test_cross_tenant_data_isolation(unauthenticated_client: TestClient):
    uid_a = uuid.uuid4().hex[:6]
    uid_b = uuid.uuid4().hex[:6]

    email_a = f"alice_{uid_a}@gmail.com"
    pass_a = "AlicePassword123"
    # 1. Register & Verify User A
    user_a_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": pass_a, "full_name": "Alice"},
    )
    assert user_a_res.status_code == 201, user_a_res.text
    user_a_id = user_a_res.json()["data"]["user"]["id"]
    token_v_a = create_verification_token(user_id=user_a_id, email=email_a)
    unauthenticated_client.get(f"/api/v1/auth/verify-email?token={token_v_a}")

    login_a_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email_a, "password": pass_a},
    )
    assert login_a_res.status_code == 200
    token_a = login_a_res.json()["data"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register & Verify User B
    email_b = f"bob_{uid_b}@gmail.com"
    pass_b = "BobPassword123"
    user_b_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": pass_b, "full_name": "Bob"},
    )
    assert user_b_res.status_code == 201, user_b_res.text
    user_b_id = user_b_res.json()["data"]["user"]["id"]
    token_v_b = create_verification_token(user_id=user_b_id, email=email_b)
    unauthenticated_client.get(f"/api/v1/auth/verify-email?token={token_v_b}")

    login_b_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email_b, "password": pass_b},
    )
    assert login_b_res.status_code == 200
    token_b = login_b_res.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A gets categories (seeded automatically)
    cats_a_res = unauthenticated_client.get("/api/v1/categories", headers=headers_a)
    assert cats_a_res.status_code == 200
    cats_a = cats_a_res.json()["data"]
    assert len(cats_a) > 0
    cat_a_id = cats_a[0]["id"]

    # User B gets categories (seeded automatically)
    cats_b_res = unauthenticated_client.get("/api/v1/categories", headers=headers_b)
    assert cats_b_res.status_code == 200
    cats_b = cats_b_res.json()["data"]
    assert len(cats_b) > 0
    cat_b_id = cats_b[0]["id"]

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # 4. User A logs an expense of ₹2,500
    exp_a_res = unauthenticated_client.post(
        "/api/v1/expenses",
        headers=headers_a,
        json={
            "title": "Alice Private Book",
            "amount": 2500.00,
            "category_id": cat_a_id,
            "date": today_str,
        },
    )
    assert exp_a_res.status_code == 201
    exp_a_id = exp_a_res.json()["data"]["id"]

    # 5. User B lists expenses -> Must be 0
    list_b_res = unauthenticated_client.get("/api/v1/expenses", headers=headers_b)
    assert list_b_res.status_code == 200
    assert len(list_b_res.json()["data"]) == 0
    assert list_b_res.json()["meta"]["total"] == 0

    # 6. User B attempts to GET User A's expense by ID -> 404 NOT FOUND
    steal_get_res = unauthenticated_client.get(f"/api/v1/expenses/{exp_a_id}", headers=headers_b)
    assert steal_get_res.status_code == 404
    assert steal_get_res.json()["error"]["code"] == "NOT_FOUND"

    # 7. User B attempts to PATCH User A's expense -> 404 NOT FOUND
    steal_patch_res = unauthenticated_client.patch(
        f"/api/v1/expenses/{exp_a_id}",
        headers=headers_b,
        json={"title": "Hacked Title", "amount": 1.00},
    )
    assert steal_patch_res.status_code == 404

    # 8. User B attempts to DELETE User A's expense -> 404 NOT FOUND
    steal_del_res = unauthenticated_client.delete(f"/api/v1/expenses/{exp_a_id}", headers=headers_b)
    assert steal_del_res.status_code == 404

    # 9. User B attempts to DELETE User A's category -> 404 NOT FOUND
    steal_cat_del = unauthenticated_client.delete(f"/api/v1/categories/{cat_a_id}", headers=headers_b)
    assert steal_cat_del.status_code == 404

    # 10. User A and User B can create identical category names in their own accounts
    create_cat_a = unauthenticated_client.post("/api/v1/categories", headers=headers_a, json={"name": "Photography"})
    assert create_cat_a.status_code == 201
    create_cat_b = unauthenticated_client.post("/api/v1/categories", headers=headers_b, json={"name": "Photography"})
    assert create_cat_b.status_code == 201

    # 11. Dashboard Isolation: User A sees total_spent 2500, User B sees total_spent 0
    dash_a = unauthenticated_client.get("/api/v1/dashboard/summary", headers=headers_a)
    assert dash_a.status_code == 200
    assert float(dash_a.json()["data"]["total_spent"]) == 2500.00

    dash_b = unauthenticated_client.get("/api/v1/dashboard/summary", headers=headers_b)
    assert dash_b.status_code == 200
    assert float(dash_b.json()["data"]["total_spent"]) == 0.00

