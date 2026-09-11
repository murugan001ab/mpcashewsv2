from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.about import AboutPageResponse, AboutImageResponse, AboutImageCategory
from app.services.about import AboutService

router = APIRouter()


@router.get("", response_model=AboutPageResponse)
async def get_about_page(db: AsyncSession = Depends(get_db)):
    """Public: About Us page content (hero copy, company story, SEO
    title/description). Admin-editable via PATCH /admin/about."""
    service = AboutService(db)
    return await service.get_page()


@router.get("/images", response_model=list[AboutImageResponse])
async def list_about_images(
    category: Optional[AboutImageCategory] = Query(None, description="Filter to one category: farm, factory, product, sales"),
    db: AsyncSession = Depends(get_db),
):
    """Public: active About-page gallery images, grouped by category
    (farm / factory / product / sales), in display order. Admin-editable
    via /admin/about/images."""
    service = AboutService(db)
    return await service.get_public_images(category)
