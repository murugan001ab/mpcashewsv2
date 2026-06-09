from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.delivery import Delivery
from app.repositories.base import BaseRepository


class DeliveryRepository(BaseRepository[Delivery]):
    def __init__(self, db: AsyncSession):
        super().__init__(Delivery, db)

    async def get_by_order(self, order_id: UUID) -> Optional[Delivery]:
        result = await self.db.execute(select(Delivery).where(Delivery.order_id == order_id))
        return result.scalar_one_or_none()

    async def get_by_awb(self, awb_code: str) -> Optional[Delivery]:
        result = await self.db.execute(select(Delivery).where(Delivery.awb_code == awb_code))
        return result.scalar_one_or_none()
