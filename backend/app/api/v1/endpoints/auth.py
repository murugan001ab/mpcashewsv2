from fastapi import APIRouter, Depends, Response, Request, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    SendOTPRequest,
    VerifyOTPRequest,
    OTPResponse,
    RegisterResponse,
    ResendVerificationRequest,
)
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import AuthService

router = APIRouter()


# ---------------------------------------------------------------------------
# Registration & email verification
# ---------------------------------------------------------------------------


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register with email + password only.
    A verification link is emailed; no tokens are issued until the email is confirmed.
    """
    service = AuthService(db)
    return await service.register(data)


@router.get("/verify-email", response_model=dict)
async def verify_email(
    token: str = Query(..., description="Verification token from email link"),
    db: AsyncSession = Depends(get_db),
):
    """Verify a user's email address using the token sent by email."""
    service = AuthService(db)
    return await service.verify_email(token)


@router.post("/resend-verification", response_model=dict)
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resend the verification email if the user didn't receive it."""
    service = AuthService(db)
    return await service.resend_verification(data.email)


# ---------------------------------------------------------------------------
# Login / logout / token refresh
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password.

    On success the server writes two HttpOnly cookies:
    - **access_token**  (path=/api, expires in JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    - **refresh_token** (path=/api/v1/auth/refresh, expires in JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    The response body carries only non-sensitive metadata (user_id, role).
    The raw token strings are never exposed in the JSON body.
    """
    service = AuthService(db)
    return await service.login(data, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout: revoke the refresh token in the DB and clear both HttpOnly cookies.
    The frontend must NOT attempt to delete cookies itself — only the server can
    clear HttpOnly cookies correctly.
    """
    service = AuthService(db)
    await service.logout(current_user, response)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Rotate tokens.

    The browser automatically sends the refresh_token HttpOnly cookie
    (path=/api/v1/auth/refresh) with this request — no body needed.
    New access_token and refresh_token cookies are set in the response.
    """
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing",
        )
    service = AuthService(db)
    return await service.refresh_tokens(token, response)


# ---------------------------------------------------------------------------
# Current user — lets the frontend check session without localStorage
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    """
    Return the profile of the currently authenticated user.

    The frontend can call this on app-load to restore session state
    instead of reading a token from localStorage.
    """
    return current_user


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------


@router.get("/google/login")
async def google_login(db: AsyncSession = Depends(get_db)):
    """Redirect URL for Google OAuth login."""
    service = AuthService(db)
    url = await service.get_google_auth_url()
    return {"authorization_url": url}


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Google OAuth callback handler. Sets HttpOnly cookies on success."""
    service = AuthService(db)
    return await service.google_callback(code, response)


# ---------------------------------------------------------------------------
# Phone OTP verification (triggered when user adds address / checks out)
# ---------------------------------------------------------------------------


@router.post("/phone/send-otp", response_model=OTPResponse)
async def send_phone_otp(
    data: SendOTPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a 6-digit OTP to the given phone number via WhatsApp."""
    service = AuthService(db)
    sent = await service.send_phone_otp(user_id=current_user.id, phone=data.phone)
    if sent:
        return OTPResponse(success=True, message="OTP sent successfully via WhatsApp.")
    return OTPResponse(success=False, message="OTP generated but WhatsApp delivery failed. Check server logs.")


@router.post("/phone/verify-otp", response_model=OTPResponse)
async def verify_phone_otp(
    data: VerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify the OTP sent to the phone number and save it on the user profile."""
    service = AuthService(db)
    await service.verify_phone_otp(
        user_id=current_user.id, phone=data.phone, code=data.code
    )
    return OTPResponse(success=True, message="Phone number verified successfully.")
