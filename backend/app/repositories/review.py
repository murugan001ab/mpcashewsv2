from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.repositories.base import BaseRepository


class ReviewRepository(BaseRepository[Review]):
    def __init__(self, db: AsyncSession):
        super().__init__(Review, db)

    def _with_relations(self):
        return (selectinload(Review.user),)

    async def get_with_relations(self, review_id: UUID) -> Optional[Review]:
        result = await self.db.execute(
            select(Review).options(*self._with_relations()).where(Review.id == review_id)
        )
        return result.scalar_one_or_none()

    async def get_by_product_and_user(self, product_id: UUID, user_id: UUID) -> Optional[Review]:
        result = await self.db.execute(
            select(Review).where(Review.product_id == product_id, Review.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_for_product(
        self,
        product_id: UUID,
        skip: int = 0,
        limit: int = 20,
        approved_only: bool = True,
    ) -> Tuple[List[Review], int]:
        stmt = select(Review).options(*self._with_relations()).where(Review.product_id == product_id)
        count_stmt = select(func.count()).select_from(Review).where(Review.product_id == product_id)

        if approved_only:
            stmt = stmt.where(Review.is_approved == True)
            count_stmt = count_stmt.where(Review.is_approved == True)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(Review.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def get_rating_summary(self, product_id: UUID) -> dict:
        result = await self.db.execute(
            select(Review.rating, func.count(Review.id))
            .where(Review.product_id == product_id, Review.is_approved == True)
            .group_by(Review.rating)
        )
        rows = result.all()
        breakdown = {str(i): 0 for i in range(1, 6)}
        total = 0
        weighted_sum = 0
        for rating, count in rows:
            breakdown[str(rating)] = count
            total += count
            weighted_sum += rating * count
        average = round(weighted_sum / total, 2) if total else 0.0
        return {"average_rating": average, "total_reviews": total, "rating_breakdown": breakdown}

    async def get_all_admin(
        self,
        skip: int = 0,
        limit: int = 20,
        is_approved: Optional[bool] = None,
        product_id: Optional[UUID] = None,
    ) -> Tuple[List[Review], int]:
        stmt = select(Review).options(*self._with_relations())
        count_stmt = select(func.count()).select_from(Review)

        if is_approved is not None:
            stmt = stmt.where(Review.is_approved == is_approved)
            count_stmt = count_stmt.where(Review.is_approved == is_approved)
        if product_id:
            stmt = stmt.where(Review.product_id == product_id)
            count_stmt = count_stmt.where(Review.product_id == product_id)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(Review.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total
