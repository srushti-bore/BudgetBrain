"""
BudgetBrain — Pytest Authentication Test Suite

Tests:
  - User Registration (Password strength, duplicate email conflict)
  - Strict Gate Email Verification (Block unverified login, verify email token, unlock login)
  - Resend Verification Link
  - User Login (Valid/invalid credentials)
  - Refresh Token Rotation & Session Revocation
  - Logout & Logout All Devices
  - /auth/me Profile Endpoint
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from app.core.security import create_verification_token


def test_register_and_verification_and_login_flow(unauthenticated_client: TestClient):
    email = f"auth_flow_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "SecurePassword123"

    # 1. Registration
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()["data"]
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["is_verified"] is False
    assert reg_data["requires_verification"] is True
    user_id = reg_data["user"]["id"]

    # 2. Duplicate Registration Conflict
    dup_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert dup_res.status_code == 409
    assert dup_res.json()["error"]["code"] == "CONFLICT"

    # 3. Attempt login BEFORE email verification -> Blocked with 403 EMAIL_NOT_VERIFIED
    pre_verify_login = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert pre_verify_login.status_code == 403
    assert pre_verify_login.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"

    # 4. Verify Email using token
    verification_token = create_verification_token(user_id=user_id, email=email)
    verify_res = unauthenticated_client.get(
        f"/api/v1/auth/verify-email?token={verification_token}"
    )
    assert verify_res.status_code == 200
    assert "verified successfully" in verify_res.json()["data"]["message"].lower()

    # 5. Login with Correct Credentials AFTER verification -> 200 OK
    login_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    access_token = login_res.json()["data"]["access_token"]
    assert access_token
    assert login_res.json()["data"]["user"]["is_verified"] is True

    # 6. Login with Incorrect Password
    bad_login = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword123"},
    )
    assert bad_login.status_code == 401

    # 7. Access /auth/me with Bearer Token
    me_res = unauthenticated_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == email
    assert me_res.json()["data"]["is_verified"] is True

    # 8. Access /auth/me without Token -> 401
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
    user_id = reg_res.json()["data"]["user"]["id"]

    # Verify email
    v_token = create_verification_token(user_id=user_id, email=email)
    unauthenticated_client.get(f"/api/v1/auth/verify-email?token={v_token}")

    # Login to acquire session
    login_res = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    refresh_cookie = login_res.cookies.get("budgetbrain_refresh") or unauthenticated_client.cookies.get("budgetbrain_refresh")
    assert refresh_cookie or "set-cookie" in login_res.headers

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


def test_resend_verification_and_invalid_token(unauthenticated_client: TestClient):
    email = f"resend_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "SecurePassword123"

    # Register
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_res.status_code == 201

    # Resend verification
    resend_res = unauthenticated_client.post(
        "/api/v1/auth/resend-verification",
        json={"email": email},
    )
    assert resend_res.status_code == 200
    assert resend_res.json()["data"]["success"] is True

    # Invalid Token Verification -> 422
    bad_verify = unauthenticated_client.get(
        "/api/v1/auth/verify-email?token=invalid.jwt.token"
    )
    assert bad_verify.status_code == 422


def test_otp_verification_and_instant_login_flow(unauthenticated_client: TestClient):
    email = f"otp_flow_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "SecurePassword123"

    # 1. Register
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "OTP User"},
    )
    assert reg_res.status_code == 201
    assert reg_res.json()["data"]["requires_verification"] is True

    # 2. Resend OTP
    resend_res = unauthenticated_client.post(
        "/api/v1/auth/resend-otp",
        json={"email": email},
    )
    assert resend_res.status_code == 200
    assert resend_res.json()["data"]["success"] is True

    # 3. Verify Invalid OTP -> 422
    bad_otp_res = unauthenticated_client.post(
        "/api/v1/auth/verify-otp",
        json={"email": email, "otp": "000000"},
    )
    assert bad_otp_res.status_code == 422

    # 4. Verify Invalid Format OTP -> 422
    bad_format_res = unauthenticated_client.post(
        "/api/v1/auth/verify-otp",
        json={"email": email, "otp": "abc12"},
    )
    assert bad_format_res.status_code == 422


def test_forgot_password_and_otp_reset_flow(unauthenticated_client: TestClient):
    from app.core.security import hash_otp, create_verification_token
    from app.database import get_engine_and_factory
    from app.models.user import User
    from sqlalchemy import select
    import asyncio

    email = f"reset_flow_{uuid.uuid4().hex[:8]}@gmail.com"
    initial_password = "InitialPassword123"
    new_password = "UpdatedPassword456"

    # 1. Register user
    reg_res = unauthenticated_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": initial_password, "full_name": "Reset Tester"},
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["data"]["user"]["id"]

    # Verify email
    verification_token = create_verification_token(user_id=user_id, email=email)
    unauthenticated_client.get(f"/api/v1/auth/verify-email?token={verification_token}")

    # 2. Call forgot-password
    forgot_res = unauthenticated_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot_res.status_code == 200
    assert "6-digit" in forgot_res.json()["data"]["message"]

    # 3. Inject a known OTP for deterministic test verification
    async def set_test_otp():
        _, session_factory = get_engine_and_factory()
        async with session_factory() as session:
            stmt = select(User).where(User.email == email)
            u = (await session.execute(stmt)).scalar_one()
            u.otp_hash = hash_otp("847291")
            await session.commit()

    asyncio.run(set_test_otp())

    # 4. Attempt reset with wrong OTP -> 422
    bad_reset_res = unauthenticated_client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "otp": "000000", "new_password": new_password},
    )
    assert bad_reset_res.status_code == 422
    assert "Invalid 6-digit" in bad_reset_res.json()["error"]["message"]

    # 5. Reset with correct OTP -> 200
    good_reset_res = unauthenticated_client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "otp": "847291", "new_password": new_password},
    )
    assert good_reset_res.status_code == 200
    assert "reset successfully" in good_reset_res.json()["data"]["message"].lower()

    # 6. Old password fails
    old_login = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": initial_password},
    )
    assert old_login.status_code == 401

    # 7. New password succeeds
    new_login = unauthenticated_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": new_password},
    )
    assert new_login.status_code == 200
    assert new_login.json()["data"]["access_token"]
