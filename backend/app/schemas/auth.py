from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """
    Returned after successful login / token refresh.

    NOTE: The actual JWT tokens are delivered as HttpOnly cookies
    (access_token, refresh_token) — they are NOT included in this body so
    that the frontend never has a chance to store them in localStorage/JS.
    This body only carries non-sensitive session metadata that the frontend
    UI may need (e.g. to render the correct nav links).
    """

    token_type: str = "bearer"
    user_id: str
    role: str


class RefreshTokenRequest(BaseModel):
    """Not used in the cookie-based flow; kept for API docs / fallback clients."""
    refresh_token: str


class GoogleCallbackRequest(BaseModel):
    code: str
    state: str | None = None


# --- OTP ---

class SendOTPRequest(BaseModel):
    phone: str  # E.164 or local format; service normalises it


class VerifyOTPRequest(BaseModel):
    phone: str
    code: str


class OTPResponse(BaseModel):
    success: bool
    message: str


# --- Email verification ---

class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class RegisterResponse(BaseModel):
    """Returned after /register — no tokens yet, just a message."""
    message: str
    email: str
