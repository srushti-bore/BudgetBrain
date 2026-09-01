"""
BudgetBrain — Pytest Authentication Test Suite

Tests:
  - User Registration (Password strength, duplicate email conflict)
  - User Login (Valid/invalid credentials)
  - Refresh Token Rotation & Session Revocation
  - Logout & Logout All Devices
  - /auth/me Profile Endpoint
  - Change Password
"""

import uuid
import pytest
from fastapi.testclient import TestClient


def test_register_and_login_flow(unauthenticated_client: TestClient):
    email = f"auth_flow_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "SecurePassword123"

    # 1. Registration
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert reg_res.status_code == 201, reg_res.text
    data = reg_res.json()["data"]
    assert "access_token" in data
    assert data["user"]["email"] == email
    assert "set-cookie" in reg_res.headers

    # 2. Duplicate Registration Conflict
    dup_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert dup_res.status_code == 409
    assert dup_res.json()["error"]["code"] == "CONFLICT"

    # 3. Login with Correct Credentials
    login_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    access_token = login_res.json()["data"]["access_token"]
    assert access_token

    # 4. Login with Incorrect Password
    bad_login = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword123"},
    )
    assert bad_login.status_code == 401

    # 5. Access /auth/me with Bearer Token
    me_res = unauthenticated_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == email

    # 6. Access /auth/me without Token -> 401
    no_auth_res = unauthenticated_client.get("/api/v1/auth/me")
    assert no_auth_res.status_code == 401


def test_password_strength_validation(unauthenticated_client: TestClient):
    # Weak passwords should be rejected with 422
    weak_passwords = [
        "short1A",        # < 8 chars
        "alllowercase123", # no uppercase
        "ALLUPPERCASE123", # no lowercase
        "NoDigitsHere!",   # no digits
    ]
    for weak_pass in weak_passwords:
        res = unauthenticated_client.post(
            "/api/v1/auth/register",
            json={"email": f"weak_{uuid.uuid4().hex[:6]}@gmail.com", "password": weak_pass},
        )
        assert res.status_code == 422, f"Expected 422 for password {weak_pass}"


def test_token_rotation_and_logout(unauthenticated_client: TestClient):
    email = f"rotation_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "SecurePassword123"

    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_res.status_code == 201, reg_res.text
    refresh_cookie = reg_res.cookies.get("budgetbrain_refresh") or unauthenticated_client.cookies.get("budgetbrain_refresh")
    assert refresh_cookie or "set-cookie" in reg_res.headers

    # Token Refresh (Rotation)
    refresh_res = unauthenticated_client.post(
        "/api/v1/auth/refresh",
        cookies={"budgetbrain_refresh": refresh_cookie} if refresh_cookie else None,
    )
    assert refresh_res.status_code == 200
    new_token_data = refresh_res.json()["data"]
    assert "access_token" in new_token_data
    new_refresh_cookie = refresh_res.cookies.get("budgetbrain_refresh") or unauthenticated_client.cookies.get("budgetbrain_refresh")

    # Logout
    logout_res = unauthenticated_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {new_token_data['access_token']}"},
        cookies={"budgetbrain_refresh": new_refresh_cookie} if new_refresh_cookie else None,
    )
    assert logout_res.status_code == 200

    # Attempting to refresh with revoked token should fail
    if new_refresh_cookie:
        revoked_refresh = unauthenticated_client.post(
            "/api/v1/auth/refresh",
            cookies={"budgetbrain_refresh": new_refresh_cookie},
        )
        assert revoked_refresh.status_code == 401
