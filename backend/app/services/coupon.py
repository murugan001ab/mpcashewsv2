from datetime import datetime, timezone
from decimal import Decimal
from typing import Tuple
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coupon import Coupon, CouponUsage, DiscountType
from app.repositories.coupon import CouponRepository
from app.schemas.coupon import CouponCreate, CouponUpdate
from app.utils.pagination import paginate, get_skip_limit


class CouponService:
    def __init__(self, db: AsyncSession):
        self.repo = CouponRepository(db)

    # ------------------------------------------------------------------
    # Admin CRUD
    # ------------------------------------------------------------------

    async def create(self, data: CouponCreate) -> Coupon:
        existing = await self.repo.get_by_code(data.code)
        if existing:
            raise HTTPException(status_code=400, detail="A coupon with this code already exists")
        if data.valid_until <= data.valid_from:
            raise HTTPException(status_code=400, detail="valid_until must be after valid_from")

        payload = data.model_dump()
        payload["code"] = data.code  # already normalized by the schema validator
        coupon = Coupon(**payload)
        return await self.repo.create(coupon)

    async def update(self, coupon_id: UUID, data: CouponUpdate) -> Coupon:
        coupon = await self.repo.get_by_id(coupon_id)
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")

        update_data = data.model_dump(exclude_unset=True)
        if "valid_from" in update_data or "valid_until" in update_data:
            new_from = update_data.get("valid_from", coupon.valid_from)
            new_until = update_data.get("valid_until", coupon.valid_until)
            if new_until <= new_from:
                raise HTTPException(status_code=400, detail="valid_until must be after valid_from")

        return await self.repo.update(coupon, update_data)

    async def delete(self, coupon_id: UUID) -> None:
        coupon = await self.repo.get_by_id(coupon_id)
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        await self.repo.delete(coupon)

    async def get_by_id(self, coupon_id: UUID) -> Coupon:
        coupon = await self.repo.get_by_id(coupon_id)
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return coupon

    async def list_all(self, page: int = 1, page_size: int = 20) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        coupons, total = await self.repo.list_paginated(skip, limit)
        return {"items": coupons, **paginate(total, page, page_size)}

    # ------------------------------------------------------------------
    # Validation / application — shared by the "apply coupon" preview
    # endpoint and by OrderService.create_order at actual checkout time.
    # ------------------------------------------------------------------

    async def validate_coupon(
        self, code: str, user_id: UUID, order_subtotal: Decimal
    ) -> Tuple[Coupon, Decimal]:
        """Validate a coupon for this user/cart and return (coupon, discount_amount).
        Raises HTTPException with a clear, user-facing reason if it can't be applied."""
        coupon = await self.repo.get_by_code(code)
        if not coupon:
            raise HTTPException(status_code=404, detail="Invalid coupon code")

        if not coupon.is_active:
            raise HTTPException(status_code=400, detail="This coupon is no longer active")

        now = datetime.now(timezone.utc)
        if now < coupon.valid_from:
            raise HTTPException(status_code=400, detail="This coupon is not active yet")
        if now > coupon.valid_until:
            raise HTTPException(status_code=400, detail="This coupon has expired")

        if order_subtotal < coupon.min_order_value:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum order value of \u20b9{coupon.min_order_value} required for this coupon",
            )

        if coupon.usage_limit_total is not None and coupon.times_used >= coupon.usage_limit_total:
            raise HTTPException(status_code=400, detail="This coupon has reached its usage limit")

        if coupon.usage_limit_per_user is not None:
            used_by_user = await self.repo.count_user_usage(coupon.id, user_id)
            if used_by_user >= coupon.usage_limit_per_user:
                raise HTTPException(
                    status_code=400,
                    detail="You have already used this coupon the maximum number of times",
                )

        if coupon.discount_type == DiscountType.PERCENTAGE:
            discount = (order_subtotal * coupon.discount_value / Decimal("100")).quantize(Decimal("0.01"))
            if coupon.max_discount_amount is not None:
                discount = min(discount, coupon.max_discount_amount)
        else:
            discount = coupon.discount_value

        # Never discount more than the order is actually worth.
        discount = min(discount, order_subtotal)

        return coupon, discount

    async def apply_preview(self, code: str, user_id: UUID, order_subtotal: Decimal) -> Decimal:
        _, discount = await self.validate_coupon(code, user_id, order_subtotal)
        return discount

    async def record_usage(
        self, coupon: Coupon, user_id: UUID, order_id: UUID, discount_amount: Decimal
    ) -> None:
        usage = CouponUsage(
            coupon_id=coupon.id,
            user_id=user_id,
            order_id=order_id,
            discount_amount=discount_amount,
        )
        await self.repo.record_usage(usage)
        coupon.times_used += 1
        await self.repo.db.flush()
