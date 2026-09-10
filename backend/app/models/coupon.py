import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import String, Numeric, Integer, DateTime, ForeignKey, Enum, Boolean, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class DiscountType(str, PyEnum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class Coupon(Base):
    """A discount code an admin can create (e.g. for a festival sale or a
    promoter-given code) that users can apply at checkout. Usage is capped
    globally (`usage_limit_total`) and/or per-user (`usage_limit_per_user`);
    either can be left null for "unlimited"."""

    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_type: Mapped[DiscountType] = mapped_column(Enum(DiscountType), nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Cap on the discount amount for percentage coupons (ignored for fixed).
    max_discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    min_order_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    usage_limit_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usage_limit_per_user: Mapped[int | None] = mapped_column(Integer, nullable=True)
    times_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    usages: Mapped[list["CouponUsage"]] = relationship(
        "CouponUsage", back_populates="coupon", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Coupon {self.code}>"


class CouponUsage(Base):
    """One row per time a coupon was actually consumed on a placed order —
    used to enforce `usage_limit_per_user` and for admin reporting."""

    __tablename__ = "coupon_usages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coupon_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    coupon: Mapped["Coupon"] = relationship("Coupon", back_populates="usages")

    __table_args__ = (
        Index("ix_coupon_usages_coupon_user", "coupon_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<CouponUsage coupon_id={self.coupon_id} user_id={self.user_id}>"
