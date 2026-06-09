from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.wishlist import WishlistResponse, WishlistAddRequest
from app.services.wishlist import WishlistService

router = APIRouter()


@router.get("", response_model=WishlistResponse)
async def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user wishlist."""
    service = WishlistService(db)
    wishlist = await service.get_wishlist(current_user.id)
    return WishlistResponse(
        id=str(wishlist.id),
        items=[{"id": str(i.id), "product": i.product} for i in wishlist.items],
        total=len(wishlist.items),
    )


@router.post("/items", response_model=WishlistResponse)
async def add_to_wishlist(
    data: WishlistAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a product to wishlist."""
    service = WishlistService(db)
    wishlist = await service.add_product(current_user.id, UUID(data.product_id))
    return WishlistResponse(
        id=str(wishlist.id),
        items=[{"id": str(i.id), "product": i.product} for i in wishlist.items],
        total=len(wishlist.items),
    )


@router.delete("/items/{product_id}", response_model=WishlistResponse)
async def remove_from_wishlist(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a product from wishlist."""
    service = WishlistService(db)
    wishlist = await service.remove_product(current_user.id, product_id)
    return WishlistResponse(
        id=str(wishlist.id),
        items=[{"id": str(i.id), "product": i.product} for i in wishlist.items],
        total=len(wishlist.items),
    )
