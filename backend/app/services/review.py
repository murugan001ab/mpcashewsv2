from typing import Optional, List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.models.order import Order, OrderItem, OrderStatus
from app.repositories.review import ReviewRepository
from app.repositories.product import ProductRepository
from app.schemas.review import ReviewCreate, ReviewUpdate, ProductRatingSummary
from app.utils.pagination import paginate, get_skip_limit


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReviewRepository(db)
        self.product_repo = ProductRepository(db)

    async def _check_verified_purchase(self, user_id: UUID, product_id: UUID) -> bool:
        """A review counts as a verified purchase if the user has a delivered
        order containing this product."""
        result = await self.db.execute(
            select(OrderItem.id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.user_id == user_id,
                OrderItem.product_id == product_id,
                Order.status == OrderStatus.DELIVERED,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def create_review(self, user_id: UUID, product_id: UUID, data: ReviewCreate) -> Review:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        existing = await self.repo.get_by_product_and_user(product_id, user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already reviewed this product. Use PATCH to update your review.",
            )

        is_verified = await self._check_verified_purchase(user_id, product_id)

        review = Review(
            product_id=product_id,
            user_id=user_id,
            rating=data.rating,
            title=data.title,
            comment=data.comment,
            is_verified_purchase=is_verified,
        )
        review = await self.repo.create(review)
        return await self.repo.get_with_relations(review.id)

    async def get_product_reviews(
        self, product_id: UUID, page: int = 1, page_size: int = 20
    ) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        reviews, total = await self.repo.get_for_product(
            product_id, skip=skip, limit=limit, approved_only=True
        )
        return {"items": reviews, **paginate(total, page, page_size)}

    async def get_rating_summary(self, product_id: UUID) -> ProductRatingSummary:
        summary = await self.repo.get_rating_summary(product_id)
        return ProductRatingSummary(product_id=product_id, **summary)

    async def _get_owned_review(self, user_id: UUID, review_id: UUID) -> Review:
        review = await self.repo.get_with_relations(review_id)
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        if review.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify your own review",
            )
        return review

    async def update_review(self, user_id: UUID, review_id: UUID, data: ReviewUpdate) -> Review:
        review = await self._get_owned_review(user_id, review_id)
        update_data = data.model_dump(exclude_none=True)
        await self.repo.update(review, update_data)
        # Re-fetch with relations: BaseRepository.update()'s refresh() only
        # reloads column attributes, not the selectinload'ed `user` relation
        # (touching it afterwards would trigger a lazy-load, which fails in
        # an async session with MissingGreenlet).
        return await self.repo.get_with_relations(review_id)

    async def delete_own_review(self, user_id: UUID, review_id: UUID) -> None:
        review = await self._get_owned_review(user_id, review_id)
        await self.repo.delete(review)

    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------

    async def admin_list(
        self,
        page: int = 1,
        page_size: int = 20,
        is_approved: Optional[bool] = None,
        product_id: Optional[UUID] = None,
    ) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        reviews, total = await self.repo.get_all_admin(
            skip=skip, limit=limit, is_approved=is_approved, product_id=product_id
        )
        return {"items": reviews, **paginate(total, page, page_size)}

    async def admin_get(self, review_id: UUID) -> Review:
        review = await self.repo.get_with_relations(review_id)
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        return review

    async def admin_set_approved(self, review_id: UUID, is_approved: bool) -> Review:
        review = await self.admin_get(review_id)
        await self.repo.update(review, {"is_approved": is_approved})
        return await self.repo.get_with_relations(review_id)

    async def admin_reply(self, review_id: UUID, reply: str) -> Review:
        review = await self.admin_get(review_id)
        await self.repo.update(review, {"admin_reply": reply})
        return await self.repo.get_with_relations(review_id)

    async def admin_delete(self, review_id: UUID) -> None:
        review = await self.admin_get(review_id)
        await self.repo.delete(review)
