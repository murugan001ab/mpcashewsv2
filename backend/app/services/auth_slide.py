from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_slide import AuthSlide
from app.schemas.auth_slide import AuthSlideUpdate
from app.utils.imagekit import upload_image as ik_upload_image, delete_image as ik_delete_image


class AuthSlideService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get(self, slide_id: UUID) -> AuthSlide:
        result = await self.db.execute(select(AuthSlide).where(AuthSlide.id == slide_id))
        slide = result.scalar_one_or_none()
        if not slide:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slide not found")
        return slide

    async def get_public_list(self) -> List[AuthSlide]:
        result = await self.db.execute(
            select(AuthSlide).where(AuthSlide.is_active == True).order_by(AuthSlide.sort_order)
        )
        return list(result.scalars().all())

    async def get_admin_list(self) -> List[AuthSlide]:
        result = await self.db.execute(select(AuthSlide).order_by(AuthSlide.sort_order))
        return list(result.scalars().all())

    async def create(self, file: UploadFile, quote: str, cite: Optional[str]) -> AuthSlide:
        count_result = await self.db.execute(select(AuthSlide))
        existing_count = len(count_result.scalars().all())

        url, file_id = await ik_upload_image(file, folder="auth-slides")
        slide = AuthSlide(
            url=url,
            file_id=file_id,
            quote=quote,
            cite=cite,
            sort_order=existing_count,
            is_active=True,
        )
        self.db.add(slide)
        await self.db.flush()
        await self.db.refresh(slide)
        return slide

    async def update(self, slide_id: UUID, data: AuthSlideUpdate) -> AuthSlide:
        slide = await self._get(slide_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(slide, key, value)
        await self.db.flush()
        await self.db.refresh(slide)
        return slide

    async def delete(self, slide_id: UUID) -> None:
        slide = await self._get(slide_id)
        await ik_delete_image(slide.file_id)
        await self.db.delete(slide)
        await self.db.flush()

    async def reorder(self, slide_ids: List[UUID]) -> List[AuthSlide]:
        result = await self.db.execute(select(AuthSlide))
        slides_by_id = {s.id: s for s in result.scalars().all()}

        if set(slide_ids) != set(slides_by_id.keys()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="slide_ids must match the current set of slides exactly",
            )

        for idx, slide_id in enumerate(slide_ids):
            slides_by_id[slide_id].sort_order = idx

        await self.db.flush()
        return sorted(slides_by_id.values(), key=lambda s: s.sort_order)
