import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, field_validator

from app.models.coupon import DiscountType


class CouponBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: Decimal
    max_discount_amount: Optional[Decimal] = None
    min_order_value: Decimal = Decimal("0")
    usage_limit_total: Optional[int] = None
    usage_limit_per_user: Optional[int] = None
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Coupon code cannot be empty")
        return v


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    min_order_value: Optional[Decimal] = None
    usage_limit_total: Optional[int] = None
    usage_limit_per_user: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponResponse(BaseModel):
    id: uuid.UUID
    code: str
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: Decimal
    max_discount_amount: Optional[Decimal] = None
    min_order_value: Decimal
    usage_limit_total: Optional[int] = None
    usage_limit_per_user: Optional[int] = None
    times_used: int
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCoupons(BaseModel):
    items: List[CouponResponse]
    total: int
    page: int
    page_size: int
    pages: int


class CouponApplyRequest(BaseModel):
    code: str


class CouponApplyResponse(BaseModel):
    code: str
    discount_amount: Decimal
    message: str = "Coupon applied"
