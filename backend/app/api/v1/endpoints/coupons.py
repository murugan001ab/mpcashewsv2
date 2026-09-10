from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.cart import CartRepository
from app.schemas.coupon import CouponApplyRequest, CouponApplyResponse
from app.services.coupon import CouponService

router = APIRouter()


@router.post("/apply", response_model=CouponApplyResponse)
async def apply_coupon(
    data: CouponApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate a coupon code against the current user's cart and preview the
    discount it would give. This does NOT consume the coupon — it's only
    actually recorded as used once the order is placed with this same code
    (see OrderCreate.coupon_code)."""
    cart_repo = CartRepository(db)
    cart = await cart_repo.get_by_user(current_user.id)
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    subtotal = Decimal("0")
    for item in cart.items:
        variant = item.variant
        unit_price = (variant.discounted_price or variant.price) if variant else item.price_at_add
        subtotal += unit_price * item.quantity

    service = CouponService(db)
    _, discount = await service.validate_coupon(data.code, current_user.id, subtotal)

    return CouponApplyResponse(code=data.code.strip().upper(), discount_amount=discount)
