from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleCallbackRequest(BaseModel):
    code: str
    state: str | None = None
