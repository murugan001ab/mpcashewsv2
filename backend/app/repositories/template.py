from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.template import EmailTemplate, WhatsAppTemplate
from app.repositories.base import BaseRepository


class EmailTemplateRepository(BaseRepository[EmailTemplate]):
    def __init__(self, db: AsyncSession):
        super().__init__(EmailTemplate, db)

    async def get_by_key(self, key: str) -> Optional[EmailTemplate]:
        result = await self.db.execute(select(EmailTemplate).where(EmailTemplate.key == key))
        return result.scalar_one_or_none()

    async def list_all(self) -> List[EmailTemplate]:
        result = await self.db.execute(select(EmailTemplate).order_by(EmailTemplate.name))
        return list(result.scalars().all())


class WhatsAppTemplateRepository(BaseRepository[WhatsAppTemplate]):
    def __init__(self, db: AsyncSession):
        super().__init__(WhatsAppTemplate, db)

    async def get_by_key(self, key: str) -> Optional[WhatsAppTemplate]:
        result = await self.db.execute(select(WhatsAppTemplate).where(WhatsAppTemplate.key == key))
        return result.scalar_one_or_none()

    async def list_all(self) -> List[WhatsAppTemplate]:
        result = await self.db.execute(select(WhatsAppTemplate).order_by(WhatsAppTemplate.name))
        return list(result.scalars().all())
