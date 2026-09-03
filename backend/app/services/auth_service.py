"""
BudgetBrain — Authentication & User Identity Service

SRS §3.1, §4.1, §4.2 & §5.1:
  Implements registration, login, Google OAuth 2.0 verification,
  token rotation, session revocation, and multi-tenant user seeding.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    create_verification_token,
    decode_verification_token,
    generate_numeric_otp,
    hash_otp,
    hash_password,
    hash_token,
    verify_google_id_token,
    verify_password,
)
from app.exceptions import (
    AuthenticationException,
    ConflictException,
    EmailNotVerifiedException,
    NotFoundException,
    ValidationException,
)
from app.models.category import UNCATEGORIZED_NAME, Category
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    GoogleLoginRequest,
    RegisterResponse,
    ResetPasswordRequest,
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
    ) -> tuple[User, str, str]:
        """
        Register a new user account with BCrypt password hashing.
        Automatically seeds default starter categories, generates a 6-digit OTP (10m) and 24h JWT token.
        """
        # Check if email is already taken
        stmt = select(User).where(User.email == data.email)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(
                message="An account with this email address already exists.",
                field="email",
            )

        # Generate 6-digit numeric OTP and expiry
        otp = generate_numeric_otp(6)
        now = datetime.now(timezone.utc)
        otp_expiry = now + timedelta(minutes=10)

        # Create user
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            is_active=True,
            is_verified=False,
            otp_hash=hash_otp(otp),
            otp_expires_at=otp_expiry,
        )
        self.db.add(user)
        await self.db.flush()

        # Seed starter categories
        await self.seed_starter_categories(user.id)
        await self.db.commit()
        await self.db.refresh(user)

        # Generate signed 24h verification token
        verification_token = create_verification_token(user_id=user.id, email=user.email)
        return user, otp, verification_token

    async def _create_session(
        self,
        user: User,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """Issue access token and refresh token session for an authenticated user."""
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

    async def verify_otp(
        self,
        email: str,
        otp: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """
        Verify a 6-digit numeric OTP for account activation.
        On success, marks is_verified=True, clears OTP, and issues session tokens for instant login.
        """
        stmt = select(User).where(User.email == email.lower().strip())
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        if not user:
            raise ValidationException(
                message="No account found with this email address.",
                field="email",
            )

        if not user.is_active:
            raise AuthenticationException(
                message="Your account has been deactivated.",
                field="email",
            )

        # If already verified, log them in directly
        if user.is_verified:
            return await self._create_session(user, user_agent, ip_address)

        if not user.otp_hash or not user.otp_expires_at:
            raise ValidationException(
                message="No verification code pending. Please request a new code.",
                field="otp",
            )

        now = datetime.now(timezone.utc)
        if now > user.otp_expires_at:
            raise ValidationException(
                message="Verification code has expired. Please click 'Resend Code'.",
                field="otp",
            )

        if hash_otp(otp) != user.otp_hash:
            raise ValidationException(
                message="Invalid 6-digit verification code. Please check and try again.",
                field="otp",
            )

        # Mark user as verified and clear OTP
        user.is_verified = True
        user.otp_hash = None
        user.otp_expires_at = None
        await self.db.commit()
        await self.db.refresh(user)

        # Issue immediate session tokens
        return await self._create_session(user, user_agent, ip_address)

    async def resend_otp(self, email: str) -> tuple[User | None, str | None, str | None]:
        """Generate a fresh 6-digit OTP and 24h verification token for unverified user."""
        stmt = select(User).where(User.email == email.lower().strip())
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        if not user or user.is_verified or not user.is_active:
            return user, None, None

        otp = generate_numeric_otp(6)
        user.otp_hash = hash_otp(otp)
        user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await self.db.commit()
        await self.db.refresh(user)

        token = create_verification_token(user_id=user.id, email=user.email)
        return user, otp, token

    async def verify_email(self, token: str) -> User:
        """
        Verify a user's email address using a valid verification JWT token.
        Updates user.is_verified = True.
        """
        try:
            payload = decode_verification_token(token)
        except Exception as exc:
            raise ValidationException(
                message="Email verification link is invalid or has expired. Please request a new link.",
                field="token",
            ) from exc

        if payload.get("type") != "email_verification":
            raise ValidationException(
                message="Invalid token type.",
                field="token",
            )

        user_id = payload.get("sub")
        stmt = select(User).where(User.id == user_id)
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        if not user:
            raise ValidationException(
                message="User account not found.",
                field="token",
            )

        if not user.is_verified:
            user.is_verified = True
            user.otp_hash = None
            user.otp_expires_at = None
            await self.db.commit()
            await self.db.refresh(user)

        return user

    async def resend_verification(self, email: str) -> tuple[User | None, str | None]:
        """Generate a fresh verification token for unverified user."""
        stmt = select(User).where(User.email == email.lower().strip())
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        if not user or user.is_verified or not user.is_active:
            return user, None

        token = create_verification_token(user_id=user.id, email=user.email)
        return user, token

    async def login(
        self,
        data: UserLogin,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[TokenResponse, str]:
        """Authenticate user by email and password, enforcing email verification under Strict Gate."""
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

        if not user.is_verified:
            raise EmailNotVerifiedException(
                message="Your email address is not verified. Please check your inbox for the activation link or click 'Resend Verification' below."
            )

        # Issue token pair
        return await self._create_session(user, user_agent, ip_address)

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

    async def forgot_password(self, email: str) -> tuple[User | None, str | None]:
        """Generate a secure 6-digit numeric OTP for password reset (10 mins expiry)."""
        stmt = select(User).where(User.email == email.lower().strip())
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        if not user or not user.is_active:
            return user, None

        otp = generate_numeric_otp(6)
        user.otp_hash = hash_otp(otp)
        user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await self.db.commit()
        await self.db.refresh(user)

        return user, otp

    async def reset_password(self, data: ResetPasswordRequest) -> None:
        """Verify password reset OTP (or token) and update user password."""
        user = None

        # Primary workflow: 6-digit OTP verification
        if data.email and data.otp:
            clean_email = data.email.lower().strip()
            clean_otp = data.otp.strip()
            stmt = select(User).where(User.email == clean_email)
            user = (await self.db.execute(stmt)).scalar_one_or_none()

            if not user or not user.is_active:
                raise ValidationException(
                    message="User account not found or deactivated.",
                    field="email",
                )

            if not user.otp_hash or not user.otp_expires_at:
                raise ValidationException(
                    message="No active password reset request found. Please request a new code.",
                    field="otp",
                )

            now_utc = datetime.now(timezone.utc)
            if now_utc > user.otp_expires_at:
                raise ValidationException(
                    message="Reset code has expired. Please request a fresh 6-digit code.",
                    field="otp",
                )

            if user.otp_hash != hash_otp(clean_otp):
                raise ValidationException(
                    message="Invalid 6-digit verification code. Please check your email and try again.",
                    field="otp",
                )

        # Secondary / legacy fallback: signed JWT token
        elif data.token:
            from app.core.security import decode_reset_token
            try:
                payload = decode_reset_token(data.token)
            except Exception as exc:
                raise ValidationException(
                    message="Password reset link is invalid or has expired. Please request a new code.",
                    field="token",
                ) from exc

            if payload.get("type") != "password_reset":
                raise ValidationException(
                    message="Invalid token type.",
                    field="token",
                )

            user_id = payload.get("sub")
            stmt = select(User).where(User.id == user_id)
            user = (await self.db.execute(stmt)).scalar_one_or_none()
            if not user:
                raise ValidationException(
                    message="User account not found.",
                    field="token",
                )
        else:
            raise ValidationException(
                message="Email and 6-digit reset code are required.",
                field="otp",
            )

        # Update password and clear OTP
        user.hashed_password = hash_password(data.new_password)
        user.otp_hash = None
        user.otp_expires_at = None

        # Revoke all active sessions
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id)
            .values(revoked=True)
        )
        await self.db.commit()


