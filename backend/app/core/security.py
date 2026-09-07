"""
BudgetBrain — Cryptography, Password Hashing & JWT Security Engine

SRS §6.1 & PRD FR-AUTH:
- BCrypt password hashing (minimum work factor 12)
- Short-lived Access Tokens (15 min) with HS256 / configurable algorithm
- Long-lived Refresh Tokens (7-30 days) with SHA-256 database hashing
- Google OAuth 2.0 / OpenID Connect ID token verification
"""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import bcrypt
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a plaintext password using BCrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored BCrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(
    user_id: str,
    email: str,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generate a short-lived signed JWT Access Token.
    Standard claims: sub (user_id), email, exp, iat, type="access".
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": user_id,
        "email": email.lower(),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a signed JWT Access Token.
    Raises jwt.PyJWTError on invalid signature, expired token, or malformed claims.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "type"]},
    )


def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Generate a high-entropy Refresh Token.
    Returns: (raw_plaintext_token, sha256_token_hash, expires_at)
    The raw token is returned to the user in an HttpOnly cookie.
    The hash is persisted to the database.
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return raw_token, token_hash, expires_at


def hash_token(token: str) -> str:
    """SHA-256 hash for secure storage of refresh tokens and reset tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset_token() -> tuple[str, str, datetime]:
    """Generate a single-use password reset token with 15-minute validity."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    return raw_token, token_hash, expires_at


def create_reset_token(user_id: str, email: str) -> str:
    """Generate a 15-minute signed JWT password reset token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=15)
    payload = {
        "sub": user_id,
        "email": email.lower(),
        "type": "password_reset",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_reset_token(token: str) -> dict:
    """Decode and validate a signed password reset JWT token."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "type"]},
    )


def create_verification_token(user_id: str, email: str, expires_hours: int = 24) -> str:
    """Generate a 24-hour signed JWT email verification token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=expires_hours)
    payload = {
        "sub": user_id,
        "email": email.lower(),
        "type": "email_verification",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_verification_token(token: str) -> dict:
    """Decode and validate a signed email verification JWT token."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "type"]},
    )


def generate_numeric_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))


def hash_otp(otp: str) -> str:
    """SHA-256 hash for secure storage of numeric OTPs."""
    return hashlib.sha256(otp.strip().encode("utf-8")).hexdigest()



class CachedGoogleAuthRequest(google_requests.Request):
    """
    A Google Auth Request transport that caches public key certificates in memory
    for up to 6 hours (or per Cache-Control max-age), eliminating redundant 1.5-2.5s
    network round-trips to Google's public cert endpoints on user sign-in.
    """

    def __init__(self, session=None, default_ttl_seconds: int = 21600):
        import requests

        super().__init__(session=session or requests.Session())
        self._cache: dict[str, tuple[float, object]] = {}
        self._default_ttl = default_ttl_seconds

    def __call__(self, url, method="GET", body=None, headers=None, timeout=10, **kwargs):
        import time

        now = time.time()
        # Only cache idempotent GET requests without a body (e.g. Google cert endpoints)
        if method.upper() == "GET" and not body:
            cached_entry = self._cache.get(url)
            if cached_entry:
                expires_at, cached_resp = cached_entry
                if now < expires_at:
                    return cached_resp

        resp = super().__call__(
            url, method=method, body=body, headers=headers, timeout=timeout, **kwargs
        )

        if method.upper() == "GET" and not body and getattr(resp, "status", None) == 200:
            ttl = self._default_ttl
            cc = getattr(resp, "headers", {}).get("cache-control", "")
            if "max-age=" in cc:
                try:
                    for part in [p.strip() for p in cc.split(",")]:
                        if part.startswith("max-age="):
                            ttl = max(60, int(part.split("=")[1]))
                            break
                except Exception:
                    pass
            self._cache[url] = (now + ttl, resp)

        return resp

    def clear_cache(self) -> None:
        """Clear cached certificates to allow key rotation recovery."""
        self._cache.clear()


_google_auth_request: CachedGoogleAuthRequest | None = None


def get_google_auth_request() -> CachedGoogleAuthRequest:
    """
    Returns a cached google_requests.Request backed by a shared requests.Session
    and certificate in-memory TTL caching.
    """
    global _google_auth_request
    if _google_auth_request is None:
        _google_auth_request = CachedGoogleAuthRequest()
    return _google_auth_request


def verify_google_id_token(id_token_str: str) -> dict:
    """
    Verify a Google OAuth 2.0 / OpenID Connect ID token.
    Validates token signature against Google's public keys.
    Returns payload containing: sub, email, email_verified, name, picture.
    """
    request = get_google_auth_request()
    audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token_str, request, audience=audience
        )
    except Exception as first_exc:
        # If certificate cache might be stale due to key rotation, clear and retry once
        if hasattr(request, "clear_cache"):
            request.clear_cache()
        try:
            payload = google_id_token.verify_oauth2_token(
                id_token_str, request, audience=audience
            )
        except Exception as retry_exc:
            raise ValueError(f"Invalid Google ID token: {str(retry_exc)}") from retry_exc

    if not payload.get("email_verified", False):
        raise ValueError("Google email is not verified.")
    return payload
