from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import SiteSettings
from app.repositories.settings import SettingsRepository
from app.schemas.settings import SiteSettingsUpdate


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SettingsRepository(db)

    async def get(self) -> SiteSettings:
        return await self.repo.get()

    async def update(self, data: SiteSettingsUpdate) -> SiteSettings:
        row = await self.repo.get()
        # exclude_unset (not exclude_none) so an admin can deliberately clear
        # a field by sending "" — omitted fields are left untouched.
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(row, update_data)
