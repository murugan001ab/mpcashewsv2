from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewUpdate,
    ReviewResponse,
    PaginatedReviews,
    ProductRatingSummary,
)
from app.services.review import ReviewService

# Self-service router: mounted at prefix="/reviews" in router.py
# (PATCH/DELETE /reviews/{review_id})
router = APIRouter()

# Product-scoped router: mounted at prefix="" (root) in router.py
# (GET/POST /products/{product_id}/reviews...) — kept separate because the
# path already carries the "/products" segment.
product_router = APIRouter()


# ---------------------------------------------------------------------------
# Public: reviews for a given product
# ---------------------------------------------------------------------------


@product_router.get("/products/{product_id}/reviews", response_model=PaginatedReviews, tags=["Reviews"])
async def list_product_reviews(
    product_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Public: list approved reviews for a product."""
    service = ReviewService(db)
    return await service.get_product_reviews(product_id, page, page_size)


@product_router.get(
    "/products/{product_id}/reviews/summary",
    response_model=ProductRatingSummary,
    tags=["Reviews"],
)
async def product_rating_summary(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public: average rating + star breakdown for a product."""
    service = ReviewService(db)
    return await service.get_rating_summary(product_id)


@product_router.post(
    "/products/{product_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Reviews"],
)
async def create_review(
    product_id: UUID,
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a review for a product (one per user per product)."""
    service = ReviewService(db)
    return await service.create_review(current_user.id, product_id, data)


# ---------------------------------------------------------------------------
# Self-service: manage your own review
# ---------------------------------------------------------------------------


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: UUID,
    data: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update your own review."""
    service = ReviewService(db)
    return await service.update_review(current_user.id, review_id, data)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete your own review."""
    service = ReviewService(db)
    await service.delete_own_review(current_user.id, review_id)
