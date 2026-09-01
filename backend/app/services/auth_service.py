"""
BudgetBrain — Authentication & User Identity Service

SRS §3.1, §4.1, §4.2 & §5.1:
  Implements registration, login, Google OAuth 2.0 verification,
  token rotation, session revocation, and multi-tenant user seeding.
"""

from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_google_id_token,
    verify_password,
)
from app.exceptions import (
    AuthenticationException,
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.models.category import UNCATEGORIZED_NAME, Category
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    GoogleLoginRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)

settings = get_settings()

DEFAULT_STARTER_CATEGORIES = [
    ("Food & Dining", False),
    ("Groceries", False),
    ("Transportation", False),
    ("Housing & Rent", False),
    ("Utilities & Bills", False),
    ("Entertainment & Leisure", False),
    ("Healthcare & Fitness", False),
    ("Shopping & Personal", False),
    (UNCATEGORIZED_NAME, True),  # Protected system category
]


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def seed_starter_categories(self, user_id: str) -> None:
        """Seed initial starter categories for a newly registered user."""
        for cat_name, is_system in DEFAULT_STARTER_CATEGORIES:
            category = Category(
                user_id=user_id,
                name=cat_name,
                is_system=is_system,
            )
            self.db.add(category)

    async def register(
        self,
        data: UserRegister,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """
        Register a new user account with BCrypt password hashing.
        Automatically seeds default starter categories and issues token pair.
        """
        # Check if email is already taken
        stmt = select(User).where(User.email == data.email)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(
                message="An account with this email address already exists.",
                field="email",
            )

        # Create user
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            is_active=True,
            is_verified=False,
        )
        self.db.add(user)
        await self.db.flush()

        # Seed starter categories
        await self.seed_starter_categories(user.id)

        # Issue token pair
        raw_refresh, token_hash, expires_at = create_refresh_token()
        refresh_entity = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(refresh_entity)
        await self.db.commit()
        await self.db.refresh(user)

        access_token = create_access_token(user_id=user.id, email=user.email)
        token_response = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )
        return token_response, raw_refresh

    async def login(
        self,
        data: UserLogin,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """Authenticate user by email and password, issuing a fresh token pair."""
        stmt = select(User).where(User.email == data.email)
        user = (await self.db.execute(stmt)).scalar_one_or_none()

        if not user or not user.hashed_password:
            raise AuthenticationException(
                message="Invalid email or password.",
                field="password",
            )

        if not verify_password(data.password, user.hashed_password):
            raise AuthenticationException(
                message="Invalid email or password.",
                field="password",
            )

        if not user.is_active:
            raise AuthenticationException(
                message="Your account has been deactivated.",
                field="email",
            )

        # Issue token pair
        raw_refresh, token_hash, expires_at = create_refresh_token()
        refresh_entity = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(refresh_entity)
        await self.db.commit()

        access_token = create_access_token(user_id=user.id, email=user.email)
        token_response = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )
        return token_response, raw_refresh

    async def google_login(
        self,
        data: GoogleLoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """
        Verify Google ID token and authenticate or register the user.
        Safely links accounts by verified Google email.
        """
        try:
            google_data = verify_google_id_token(data.id_token)
        except Exception as exc:
            raise AuthenticationException(
                message=f"Google authentication failed: {str(exc)}",
                field="id_token",
            ) from exc

        email = google_data["email"].lower()
        google_id = google_data["sub"]
        name = google_data.get("name")
        avatar_url = google_data.get("picture")

        # Find user by google_id or email
        stmt = select(User).where((User.google_id == google_id) | (User.email == email))
        user = (await self.db.execute(stmt)).scalar_one_or_none()

        if user:
            # Safe account linking
            if not user.google_id:
                user.google_id = google_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            if name and not user.full_name:
                user.full_name = name
            user.is_verified = True
            await self.db.flush()
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_id,
                full_name=name,
                avatar_url=avatar_url,
                is_active=True,
                is_verified=True,
            )
            self.db.add(user)
            await self.db.flush()
            await self.seed_starter_categories(user.id)

        # Issue token pair
        raw_refresh, token_hash, expires_at = create_refresh_token()
        refresh_entity = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(refresh_entity)
        await self.db.commit()
        await self.db.refresh(user)

        access_token = create_access_token(user_id=user.id, email=user.email)
        token_response = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )
        return token_response, raw_refresh

    async def refresh_tokens(
        self,
        raw_refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """
        Execute Refresh Token Rotation:
        - Validates the provided refresh token hash.
        - If revoked, detects potential token theft and revokes all sessions for safety.
        - Otherwise, marks current token as revoked and issues a brand new token pair.
        """
        token_h = hash_token(raw_refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_h)
        token_entity = (await self.db.execute(stmt)).scalar_one_or_none()

        if not token_entity:
            raise AuthenticationException("Invalid session token. Please log in again.")

        if token_entity.revoked:
            # Breach detection: Revoke all active sessions for this user
            await self.db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == token_entity.user_id)
                .values(revoked=True)
            )
            await self.db.commit()
            raise AuthenticationException(
                "Suspicious session activity detected. All sessions have been logged out for security."
            )

        now = datetime.now(timezone.utc)
        if token_entity.expires_at < now:
            token_entity.revoked = True
            await self.db.commit()
            raise AuthenticationException("Session expired. Please log in again.")

        # Load user
        user_stmt = select(User).where(User.id == token_entity.user_id)
        user = (await self.db.execute(user_stmt)).scalar_one_or_none()
        if not user or not user.is_active:
            raise AuthenticationException("User account not found or deactivated.")

        # Revoke old token (Rotation)
        token_entity.revoked = True

        # Generate new refresh token pair
        new_raw_refresh, new_token_hash, new_expires_at = create_refresh_token()
        new_entity = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            expires_at=new_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(new_entity)
        await self.db.commit()

        new_access_token = create_access_token(user_id=user.id, email=user.email)
        token_response = TokenResponse(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )
        return token_response, new_raw_refresh

    async def logout(self, raw_refresh_token: str | None, user_id: str) -> None:
        """Revoke the current session's refresh token."""
        if raw_refresh_token:
            token_h = hash_token(raw_refresh_token)
            stmt = (
                update(RefreshToken)
                .where((RefreshToken.token_hash == token_h) & (RefreshToken.user_id == user_id))
                .values(revoked=True)
            )
            await self.db.execute(stmt)
            await self.db.commit()

    async def logout_all_devices(self, user_id: str) -> None:
        """Revoke all active refresh tokens for the user."""
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id)
            .values(revoked=True)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def change_password(self, user: User, data: ChangePasswordRequest) -> None:
        """Update password for authenticated user, validating old password."""
        if user.hashed_password:
            if not verify_password(data.current_password, user.hashed_password):
                raise ValidationException(
                    message="Current password is incorrect.",
                    field="current_password",
                )

        user.hashed_password = hash_password(data.new_password)
        # Revoke existing sessions
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id)
            .values(revoked=True)
        )
        await self.db.commit()
