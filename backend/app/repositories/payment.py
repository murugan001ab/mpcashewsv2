from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Payment, db)

    async def get_by_order(self, order_id: UUID) -> Optional[Payment]:
        result = await self.db.execute(select(Payment).where(Payment.order_id == order_id))
        return result.scalar_one_or_none()

    async def get_by_razorpay_order_id(self, razorpay_order_id: str) -> Optional[Payment]:
        result = await self.db.execute(
            select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
        )
        return result.scalar_one_or_none()

    async def get_user_payments(
        self, user_id: UUID, skip: int = 0, limit: int = 20
    ) -> Tuple[List[Payment], int]:
        count_result = await self.db.execute(
            select(func.count()).select_from(Payment).where(Payment.user_id == user_id)
        )
        total = count_result.scalar_one()
        result = await self.db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_total_revenue(self) -> float:
        result = await self.db.execute(
            select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.PAID)
        )
        return float(result.scalar_one() or 0)
