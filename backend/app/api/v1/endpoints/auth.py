from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    service = AuthService(db)
    user = await service.register(data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password. JWT tokens set in HTTP-only cookies."""
    service = AuthService(db)
    return await service.login(data, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout and clear auth cookies."""
    service = AuthService(db)
    await service.logout(current_user, response)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Rotate refresh token and issue new access + refresh tokens."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Refresh token missing")
    service = AuthService(db)
    return await service.refresh_tokens(refresh_token, response)


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
    """Google OAuth callback handler."""
    service = AuthService(db)
    return await service.google_callback(code, response)
