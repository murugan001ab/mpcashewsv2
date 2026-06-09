import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.payment import PaymentStatus


class PaymentOrderCreate(BaseModel):
    order_id: uuid.UUID


class RazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int           # in paise
    currency: str
    payment_id: uuid.UUID


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RefundRequest(BaseModel):
    payment_id: uuid.UUID
    amount: Optional[Decimal] = None  # None = full refund


class PaymentResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    amount: Decimal
    currency: str
    status: PaymentStatus
    refund_id: Optional[str] = None
    refund_amount: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPayments(BaseModel):
    items: List[PaymentResponse]
    total: int
    page: int
    page_size: int
    pages: int
