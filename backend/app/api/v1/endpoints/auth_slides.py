from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth_slide import AuthSlideResponse
from app.services.auth_slide import AuthSlideService

router = APIRouter()


@router.get("", response_model=list[AuthSlideResponse])
async def list_auth_slides(db: AsyncSession = Depends(get_db)):
    """Public: active image+quote slides for the /login and /register pages'
    left-hand panel, in display order. Admin-editable via /admin/auth-slides."""
    service = AuthSlideService(db)
    return await service.get_public_list()
