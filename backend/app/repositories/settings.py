from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import SiteSettings


class SettingsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self) -> SiteSettings:
        """There's always exactly one row (id=1). Create it with defaults
        on first access so callers never have to null-check."""
        result = await self.db.execute(select(SiteSettings).where(SiteSettings.id == 1))
        row = result.scalar_one_or_none()
        if row is None:
            row = SiteSettings(id=1)
            self.db.add(row)
            await self.db.flush()
            await self.db.refresh(row)
        return row

    async def update(self, row: SiteSettings, data: dict) -> SiteSettings:
        for key, value in data.items():
            setattr(row, key, value)
        await self.db.flush()
        await self.db.refresh(row)
        return row
