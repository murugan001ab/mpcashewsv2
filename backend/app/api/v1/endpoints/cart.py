from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartSummary
from app.services.cart import CartService

router = APIRouter()


@router.get("", response_model=CartSummary)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get cart summary with totals."""
    service = CartService(db)
    return await service.get_summary(current_user.id)


@router.post("/items", response_model=CartSummary)
async def add_to_cart(
    data: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a product to cart."""
    service = CartService(db)
    await service.add_item(current_user.id, data)
    return await service.get_summary(current_user.id)


@router.patch("/items/{item_id}", response_model=CartSummary)
async def update_cart_item(
    item_id: UUID,
    data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update quantity of a cart item."""
    service = CartService(db)
    await service.update_item(current_user.id, item_id, data)
    return await service.get_summary(current_user.id)


@router.delete("/items/{item_id}", response_model=CartSummary)
async def remove_from_cart(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an item from cart."""
    service = CartService(db)
    await service.remove_item(current_user.id, item_id)
    return await service.get_summary(current_user.id)


@router.delete("", status_code=204)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all items from cart."""
    service = CartService(db)
    await service.clear_cart(current_user.id)
