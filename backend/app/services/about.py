from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.about import AboutPage, AboutImage
from app.repositories.about import AboutPageRepository
from app.schemas.about import AboutPageUpdate, AboutImageUpdate
from app.utils.imagekit import upload_image as ik_upload_image, delete_image as ik_delete_image


class AboutService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AboutPageRepository(db)

    # ── Page content ────────────────────────────────────────────────────
    async def get_page(self) -> AboutPage:
        return await self.repo.get()

    async def update_page(self, data: AboutPageUpdate) -> AboutPage:
        row = await self.repo.get()
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(row, update_data)

    # ── Gallery images ──────────────────────────────────────────────────
    async def _get_image(self, image_id: UUID) -> AboutImage:
        result = await self.db.execute(select(AboutImage).where(AboutImage.id == image_id))
        image = result.scalar_one_or_none()
        if not image:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
        return image

    async def get_public_images(self, category: Optional[str] = None) -> List[AboutImage]:
        query = select(AboutImage).where(AboutImage.is_active == True)
        if category:
            query = query.where(AboutImage.category == category)
        query = query.order_by(AboutImage.category, AboutImage.sort_order)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_admin_images(self) -> List[AboutImage]:
        result = await self.db.execute(select(AboutImage).order_by(AboutImage.category, AboutImage.sort_order))
        return list(result.scalars().all())

    async def create_image(self, file: UploadFile, category: str, caption: Optional[str]) -> AboutImage:
        count_result = await self.db.execute(select(AboutImage).where(AboutImage.category == category))
        existing_count = len(count_result.scalars().all())

        url, file_id = await ik_upload_image(file, folder=f"about/{category}")
        image = AboutImage(
            url=url,
            file_id=file_id,
            category=category,
            caption=caption,
            sort_order=existing_count,
            is_active=True,
        )
        self.db.add(image)
        await self.db.flush()
        await self.db.refresh(image)
        return image

    async def update_image(self, image_id: UUID, data: AboutImageUpdate) -> AboutImage:
        image = await self._get_image(image_id)
        update_data = data.model_dump(exclude_unset=True)

        # Moving an image to a different category: its old sort_order is
        # meaningless there and can collide with an existing image's
        # position, so re-append it to the end of the new category's order
        # instead of leaving a stale/ambiguous sort_order behind.
        new_category = update_data.get("category")
        if new_category is not None and new_category != image.category:
            count_result = await self.db.execute(
                select(AboutImage).where(AboutImage.category == new_category)
            )
            update_data["sort_order"] = len(count_result.scalars().all())

        for key, value in update_data.items():
            setattr(image, key, value)
        await self.db.flush()
        await self.db.refresh(image)
        return image

    async def delete_image(self, image_id: UUID) -> None:
        image = await self._get_image(image_id)
        await ik_delete_image(image.file_id)
        await self.db.delete(image)
        await self.db.flush()

    async def reorder_images(self, category: str, image_ids: List[UUID]) -> List[AboutImage]:
        result = await self.db.execute(select(AboutImage).where(AboutImage.category == category))
        images_by_id = {img.id: img for img in result.scalars().all()}

        if set(image_ids) != set(images_by_id.keys()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image_ids must match the current set of images in this category exactly",
            )

        for idx, image_id in enumerate(image_ids):
            images_by_id[image_id].sort_order = idx

        await self.db.flush()
        return sorted(images_by_id.values(), key=lambda img: img.sort_order)
