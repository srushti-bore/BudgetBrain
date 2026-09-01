"""
BudgetBrain — Authentication & User Identity Router

SRS §5.1 & PRD FR-AUTH:
  Endpoints under /api/v1/auth:
  - Register, Login, Google OAuth
  - Refresh Token Rotation & Session Revocation
  - Current User Profile, Password Management
"""

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.dependencies import RateLimiter, get_current_user
from app.database import get_db
from app.exceptions import AuthenticationException
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)
from app.schemas.common import DataResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

login_rate_limiter = RateLimiter(requests=10, window_seconds=60)
forgot_rate_limiter = RateLimiter(requests=5, window_seconds=300)


def set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    """Set the HttpOnly, Secure, SameSite refresh token cookie."""
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key="budgetbrain_refresh",
        value=raw_refresh_token,
        max_age=max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/v1/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie upon logout."""
    response.delete_cookie(
        key="budgetbrain_refresh",
        path="/api/v1/auth",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post(
    "/register",
    response_model=DataResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: UserRegister,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-1: Register a new user account with BCrypt password hashing.
    Automatically seeds default starter categories and issues access + refresh tokens.
    """
    user_agent = request.headers.get("user-agent")
    client_ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else None
    )
    service = AuthService(db)
    token_response, raw_refresh = await service.register(
        data=body, user_agent=user_agent, ip_address=client_ip
    )
    set_refresh_cookie(response, raw_refresh)
    return DataResponse(data=token_response)


@router.post(
    "/login",
    response_model=DataResponse[TokenResponse],
    summary="Sign in with email and password",
    dependencies=[Depends(login_rate_limiter)],
)
async def login(
    body: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-2: Authenticate with email/password.
    Sets HttpOnly refresh token cookie and returns access token.
    """
    user_agent = request.headers.get("user-agent")
    client_ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else None
    )
    service = AuthService(db)
    token_response, raw_refresh = await service.login(
        data=body, user_agent=user_agent, ip_address=client_ip
    )
    set_refresh_cookie(response, raw_refresh)
    return DataResponse(data=token_response)


@router.post(
    "/google",
    response_model=DataResponse[TokenResponse],
    summary="Sign in with Google OAuth 2.0 / OpenID Connect",
)
async def google_login(
    body: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-3: Verify Google ID token and authenticate or link user.
    """
    user_agent = request.headers.get("user-agent")
    client_ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else None
    )
    service = AuthService(db)
    token_response, raw_refresh = await service.google_login(
        data=body, user_agent=user_agent, ip_address=client_ip
    )
    set_refresh_cookie(response, raw_refresh)
    return DataResponse(data=token_response)


@router.post(
    "/refresh",
    response_model=DataResponse[TokenResponse],
    summary="Rotate refresh token and issue fresh access token",
)
async def refresh_tokens(
    request: Request,
    response: Response,
    budgetbrain_refresh: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-4: Token Rotation. Reads refresh token from HttpOnly cookie,
    revokes old token, issues new token pair and sets updated cookie.
    """
    if not budgetbrain_refresh:
        raise AuthenticationException(
            message="No refresh token cookie found. Please log in.",
            field="budgetbrain_refresh",
        )

    user_agent = request.headers.get("user-agent")
    client_ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else None
    )
    service = AuthService(db)
    token_response, new_raw_refresh = await service.refresh_tokens(
        raw_refresh_token=budgetbrain_refresh,
        user_agent=user_agent,
        ip_address=client_ip,
    )
    set_refresh_cookie(response, new_raw_refresh)
    return DataResponse(data=token_response)


@router.post(
    "/logout",
    response_model=DataResponse[MessageResponse],
    summary="Sign out and revoke current session",
)
async def logout(
    response: Response,
    budgetbrain_refresh: str | None = Cookie(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-5: Revokes the current session's refresh token and clears cookie.
    """
    service = AuthService(db)
    await service.logout(
        raw_refresh_token=budgetbrain_refresh, user_id=current_user.id
    )
    clear_refresh_cookie(response)
    return DataResponse(
        data=MessageResponse(message="Logged out successfully.")
    )


@router.post(
    "/logout-all",
    response_model=DataResponse[MessageResponse],
    summary="Sign out and revoke all active sessions",
)
async def logout_all_devices(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-6: Revokes all active refresh tokens for the current user.
    """
    service = AuthService(db)
    await service.logout_all_devices(user_id=current_user.id)
    clear_refresh_cookie(response)
    return DataResponse(
        data=MessageResponse(message="Logged out from all devices successfully.")
    )


@router.get(
    "/me",
    response_model=DataResponse[UserOut],
    summary="Get current authenticated user profile",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return DataResponse(data=UserOut.model_validate(current_user))


@router.post(
    "/change-password",
    response_model=DataResponse[MessageResponse],
    summary="Change password for current authenticated user",
)
async def change_password(
    body: ChangePasswordRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-8: Update user password after verifying current password.
    """
    service = AuthService(db)
    await service.change_password(user=current_user, data=body)
    clear_refresh_cookie(response)
    return DataResponse(
        data=MessageResponse(
            message="Password updated successfully. Please log in again with your new password."
        )
    )


@router.post(
    "/forgot-password",
    response_model=DataResponse[MessageResponse],
    summary="Request a password reset link",
    dependencies=[Depends(forgot_rate_limiter)],
)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    FR-AUTH-7: Initiate password recovery.
    Always returns success to prevent user enumeration.
    """
    return DataResponse(
        data=MessageResponse(
            message="If an account with this email exists, password reset instructions have been dispatched."
        )
    )
