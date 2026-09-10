from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.settings import SiteSettingsResponse
from app.services.settings import SettingsService

router = APIRouter()


@router.get("", response_model=SiteSettingsResponse)
async def get_site_settings(db: AsyncSession = Depends(get_db)):
    """Public: site-wide business/contact/legal info for the footer and
    legal pages (address, FSSAI license, GSTIN, contact details, socials,
    trademark/copyright text). Admin-editable via PATCH /admin/settings."""
    service = SettingsService(db)
    return await service.get()
