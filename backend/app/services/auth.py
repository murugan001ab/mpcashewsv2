from typing import Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, Response, status
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
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def register(self, data: UserCreate) -> User:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            email=data.email,
            full_name=data.full_name,
            phone=data.phone,
            hashed_password=hash_password(data.password),
            role=UserRole.USER,
        )
        return await self.user_repo.create(user)

    async def login(self, data: LoginRequest, response: Response) -> dict:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not user.hashed_password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")

        return await self._issue_tokens(user, response)

    async def logout(self, user: User, response: Response) -> None:
        await self.user_repo.update_refresh_token(user.id, None)
        clear_auth_cookies(response)

    async def refresh_tokens(self, refresh_token: str, response: Response) -> dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user = await self.user_repo.get_by_id(UUID(payload["sub"]))
        if not user or user.refresh_token != refresh_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

        return await self._issue_tokens(user, response)

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
        token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": str(user.id)})

        await self.user_repo.update_refresh_token(user.id, refresh_token)
        set_auth_cookies(response, access_token, refresh_token)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "role": user.role,
        }
