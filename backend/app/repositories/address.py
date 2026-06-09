from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.address import Address
from app.repositories.base import BaseRepository


class AddressRepository(BaseRepository[Address]):
    def __init__(self, db: AsyncSession):
        super().__init__(Address, db)

    async def get_user_addresses(self, user_id: UUID) -> List[Address]:
        result = await self.db.execute(
            select(Address).where(Address.user_id == user_id).order_by(Address.is_default.desc())
        )
        return list(result.scalars().all())

    async def get_default_address(self, user_id: UUID) -> Optional[Address]:
        result = await self.db.execute(
            select(Address).where(Address.user_id == user_id, Address.is_default == True)
        )
        return result.scalar_one_or_none()

    async def clear_default(self, user_id: UUID) -> None:
        addresses = await self.get_user_addresses(user_id)
        for addr in addresses:
            addr.is_default = False
        await self.db.flush()
