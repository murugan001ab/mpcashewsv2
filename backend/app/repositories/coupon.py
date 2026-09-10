from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coupon import Coupon, CouponUsage
from app.repositories.base import BaseRepository


class CouponRepository(BaseRepository[Coupon]):
    def __init__(self, db: AsyncSession):
        super().__init__(Coupon, db)

    async def get_by_code(self, code: str) -> Optional[Coupon]:
        result = await self.db.execute(
            select(Coupon).where(Coupon.code == code.strip().upper())
        )
        return result.scalar_one_or_none()

    async def list_paginated(self, skip: int = 0, limit: int = 20) -> Tuple[List[Coupon], int]:
        count_result = await self.db.execute(select(func.count()).select_from(Coupon))
        total = count_result.scalar_one()

        result = await self.db.execute(
            select(Coupon).order_by(Coupon.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def count_user_usage(self, coupon_id: UUID, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(CouponUsage)
            .where(CouponUsage.coupon_id == coupon_id, CouponUsage.user_id == user_id)
        )
        return result.scalar_one()

    async def record_usage(self, usage: CouponUsage) -> CouponUsage:
        self.db.add(usage)
        await self.db.flush()
        return usage
