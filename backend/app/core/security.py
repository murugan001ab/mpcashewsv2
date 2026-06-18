from datetime import datetime, timedelta, timezone
from typing import Optional, Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def _cookie_kwargs() -> dict:
    """
    Base cookie attributes shared by set and delete operations.
    domain is omitted entirely when COOKIE_DOMAIN is empty so browsers
    don't reject a domain="" attribute (which is invalid).
    """
    kwargs = dict(
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    if settings.COOKIE_DOMAIN:
        kwargs["domain"] = settings.COOKIE_DOMAIN
    return kwargs


def set_auth_cookies(response: Any, access_token: str, refresh_token: str) -> None:
    """
    Write both JWT tokens as HttpOnly cookies.

    Security attributes:
      httponly=True   → JS / XSS cannot read the value
      secure=True     → Only sent over HTTPS (disable for local HTTP dev only)
      samesite="lax"  → Sent on same-site requests; blocks cross-site CSRF POSTs

    Path scoping:
      access_token  → path="/api"               (sent on every API call)
      refresh_token → path="/api/v1/auth/refresh" (sent ONLY to the refresh endpoint)
    """
    base = _cookie_kwargs()

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api",
        **base,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth/refresh",
        **base,
    )


def clear_auth_cookies(response: Any) -> None:
    """
    Delete both auth cookies.

    path/domain/secure/samesite/httponly must exactly match the values used
    when the cookies were set, otherwise the browser ignores the instruction.
    """
    base = _cookie_kwargs()
    response.delete_cookie("access_token", path="/api", **base)
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh", **base)
