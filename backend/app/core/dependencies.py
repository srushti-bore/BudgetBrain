"""
BudgetBrain — FastAPI Security Dependencies & Security Context

SRS §2.2, §3.2 & §6.1:
- Extracts and validates Bearer Access Tokens from the Authorization header.
- Derives the authenticated User identity for multi-tenant query isolation.
- Enforces in-memory sliding window rate limiting on sensitive auth endpoints.
"""

from collections import defaultdict
from datetime import datetime, timezone
import time
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_db
from app.exceptions import AuthenticationException, RateLimitException
from app.models.user import User

# Optional bearer scheme so we can raise custom standard SRS error envelopes
http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency that enforces authentication and returns the active User.
    Raises AuthenticationException (HTTP 401) on missing, invalid, or expired tokens.
    """
    if not auth or not auth.credentials:
        raise AuthenticationException(
            message="Authentication required. Please provide a valid Bearer token.",
            field="Authorization",
        )

    token = auth.credentials
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise AuthenticationException(
            message=f"Invalid or expired token: {str(exc)}",
            field="Authorization",
        ) from exc

    if payload.get("type") != "access":
        raise AuthenticationException(
            message="Invalid token type. Expected access token.",
            field="Authorization",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationException(
            message="Malformed token payload.",
            field="Authorization",
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationException(
            message="User account associated with this token was not found.",
            field="Authorization",
        )

    if not user.is_active:
        raise AuthenticationException(
            message="User account is deactivated.",
            field="Authorization",
        )

    return user


# ─────────────────────────────────────────────────────────────────────────────
# In-Memory Sliding Window Rate Limiter
# ─────────────────────────────────────────────────────────────────────────────

class RateLimiter:
    """
    Simple in-memory rate limiter for auth endpoints (e.g. login, forgot-password).
    Maintains a sliding window of timestamps per client IP.
    """

    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window_seconds = window_seconds
        self.history: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request) -> None:
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old timestamps
        timestamps = [t for t in self.history[client_ip] if t > window_start]
        if len(timestamps) >= self.requests:
            retry_after = int(timestamps[0] + self.window_seconds - now)
            raise RateLimitException(
                message=f"Too many requests. Please try again in {max(1, retry_after)} seconds."
            )

        timestamps.append(now)
        self.history[client_ip] = timestamps
