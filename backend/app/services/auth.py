import random
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    set_auth_cookies,
    clear_auth_cookies,
)
from app.models.otp import PhoneOTP, EmailVerification
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate
from app.services.whatsapp import WhatsAppService
from app.utils.email import send_verification_email


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)
        self.db = db
        self.wa = WhatsAppService()

    # ------------------------------------------------------------------
    # Registration — email + password only
    # ------------------------------------------------------------------

    async def register(self, data: UserCreate) -> dict:
        """
        Create an unverified user account and send a verification email.
        Returns a message dict; the caller must verify email before logging in.
        """
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            if existing.is_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered",
                )
            # Unverified duplicate: resend verification and exit gracefully
            await self._send_verification_token(existing)
            return {
                "message": "Account already exists but is not verified. "
                           "A new verification email has been sent.",
                "email": data.email,
            }

        # Derive a sensible default name from the email prefix
        default_name = data.email.split("@")[0].replace(".", " ").replace("_", " ").title()

        user = User(
            email=data.email,
            full_name=default_name,
            hashed_password=hash_password(data.password),
            role=UserRole.USER,
            is_verified=False,
        )
        user = await self.user_repo.create(user)

        await self._send_verification_token(user)

        return {
            "message": "Registration successful! Please check your email to verify your account.",
            "email": data.email,
        }

    async def _send_verification_token(self, user: User) -> None:
        """Generate an e-mail verification token and send it."""
        # Invalidate old tokens for this user
        result = await self.db.execute(
            select(EmailVerification).where(
                EmailVerification.user_id == user.id,
                EmailVerification.is_used == False,
            )
        )
        for old_token in result.scalars().all():
            old_token.is_used = True

        token = secrets.token_urlsafe(64)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFY_EXPIRE_HOURS
        )
        ev = EmailVerification(user_id=user.id, token=token, expires_at=expires_at)
        self.db.add(ev)
        await self.db.flush()

        await send_verification_email(user.email, token)

    async def verify_email(self, token: str) -> dict:
        """Mark a user's email as verified using the token from the link."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(EmailVerification).where(
                EmailVerification.token == token,
                EmailVerification.is_used == False,
                EmailVerification.expires_at > now,
            )
        )
        ev = result.scalar_one_or_none()
        if not ev:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link is invalid or has expired.",
            )

        ev.is_used = True
        user = await self.user_repo.get_by_id(ev.user_id)
        if user:
            user.is_verified = True
        await self.db.flush()

        return {"message": "Email verified successfully. You can now log in."}

    async def resend_verification(self, email: str) -> dict:
        """Resend the verification email for an unverified account."""
        user = await self.user_repo.get_by_email(email)
        if not user:
            # Return generic message to prevent email enumeration
            return {"message": "If an unverified account exists for this email, a new link has been sent."}
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account is already verified.",
            )
        await self._send_verification_token(user)
        return {"message": "Verification email resent. Please check your inbox."}

    # ------------------------------------------------------------------
    # Login — blocks unverified users
    # ------------------------------------------------------------------

    async def login(self, data: LoginRequest, response: Response) -> dict:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account deactivated",
            )
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in. "
                       "Check your inbox or use /auth/resend-verification.",
            )

        return await self._issue_tokens(user, response)

    async def logout(self, user: User, response: Response) -> None:
        await self.user_repo.update_refresh_token(user.id, None)
        clear_auth_cookies(response)

    async def refresh_tokens(self, refresh_token: str, response: Response) -> dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user = await self.user_repo.get_by_id(UUID(payload["sub"]))
        if not user or user.refresh_token != refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revoked",
            )

        return await self._issue_tokens(user, response)

    # ------------------------------------------------------------------
    # Google OAuth
    # ------------------------------------------------------------------

    async def get_google_auth_url(self) -> str:
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
        }
        from urllib.parse import urlencode
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def google_callback(self, code: str, response: Response) -> dict:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange Google code")

            token_data = token_resp.json()
            user_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            if user_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

            google_user = user_resp.json()

        google_id = google_user["id"]
        email = google_user["email"]
        full_name = google_user.get("name", email.split("@")[0])
        avatar_url = google_user.get("picture")

        user = await self.user_repo.get_by_google_id(google_id)
        if not user:
            user = await self.user_repo.get_by_email(email)
            if user:
                user.google_id = google_id
                user.avatar_url = avatar_url or user.avatar_url
                # Google-verified email counts as verified
                user.is_verified = True
            else:
                user = User(
                    email=email,
                    full_name=full_name,
                    google_id=google_id,
                    avatar_url=avatar_url,
                    is_verified=True,
                    role=UserRole.USER,
                )
                user = await self.user_repo.create(user)

        return await self._issue_tokens(user, response)

    async def _issue_tokens(self, user: User, response: Response) -> dict:
        """
        Create access + refresh tokens, persist the refresh token in the DB,
        and write BOTH tokens into HttpOnly cookies on the response.

        The raw token strings are intentionally NOT returned in the dict so
        the frontend can never store them in localStorage / JS memory.
        """
        token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": str(user.id)})

        await self.user_repo.update_refresh_token(user.id, refresh_token)
        set_auth_cookies(response, access_token, refresh_token)

        # Return only non-sensitive metadata the UI needs
        return {
            "token_type": "bearer",
            "user_id": str(user.id),
            "role": user.role,
        }

    # ------------------------------------------------------------------
    # Phone OTP — triggered at checkout when user adds an address
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_otp(length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    async def send_phone_otp(self, user_id: UUID, phone: str) -> bool:
        """Generate an OTP, persist it, and send via WhatsApp."""
        otp_code = self._generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.OTP_EXPIRE_MINUTES
        )

        # Invalidate any previous unused OTPs for this user+phone
        result = await self.db.execute(
            select(PhoneOTP).where(
                PhoneOTP.user_id == user_id,
                PhoneOTP.phone == phone,
                PhoneOTP.is_used == False,
            )
        )
        for old in result.scalars().all():
            old.is_used = True

        otp = PhoneOTP(
            user_id=user_id,
            phone=phone,
            code=otp_code,
            expires_at=expires_at,
        )
        self.db.add(otp)
        await self.db.flush()

        sent = await self.wa.send_otp(phone=phone, otp_code=otp_code)
        return sent

    async def verify_phone_otp(self, user_id: UUID, phone: str, code: str) -> bool:
        """Verify OTP and mark the user's phone as verified on success."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(PhoneOTP).where(
                PhoneOTP.user_id == user_id,
                PhoneOTP.phone == phone,
                PhoneOTP.code == code,
                PhoneOTP.is_used == False,
                PhoneOTP.expires_at > now,
            )
        )
        otp = result.scalar_one_or_none()
        if not otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP",
            )

        otp.is_used = True

        user = await self.user_repo.get_by_id(user_id)
        if user:
            user.phone = phone

        await self.db.flush()
        return True
