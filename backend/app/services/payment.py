import hashlib
import hmac
from decimal import Decimal
from uuid import UUID

import razorpay
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.order import OrderStatus
from app.repositories.payment import PaymentRepository
from app.repositories.order import OrderRepository
from app.schemas.payment import PaymentOrderCreate, PaymentVerify, RefundRequest
from app.utils.pagination import paginate, get_skip_limit


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.payment_repo = PaymentRepository(db)
        self.order_repo = OrderRepository(db)
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    async def create_payment_order(self, user_id: UUID, data: PaymentOrderCreate) -> dict:
        order = await self.order_repo.get_with_relations(data.order_id)
        if not order or order.user_id != user_id:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status not in (OrderStatus.PENDING, OrderStatus.CONFIRMED):
            raise HTTPException(status_code=400, detail="Order is not payable")

        existing = await self.payment_repo.get_by_order(order.id)
        if existing and existing.status == PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Order already paid")

        amount_paise = int(order.total_amount * 100)
        rz_order = self.client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": order.order_number,
        })

        if existing:
            existing.razorpay_order_id = rz_order["id"]
            existing.status = PaymentStatus.CREATED
            payment = existing
        else:
            payment = Payment(
                order_id=order.id,
                user_id=user_id,
                razorpay_order_id=rz_order["id"],
                amount=order.total_amount,
                currency="INR",
                status=PaymentStatus.CREATED,
            )
            payment = await self.payment_repo.create(payment)

        await self.payment_repo.db.flush()
        return {
            "razorpay_order_id": rz_order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "payment_id": payment.id,
        }

    async def verify_payment(self, data: PaymentVerify) -> Payment:
        payment = await self.payment_repo.get_by_razorpay_order_id(data.razorpay_order_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        # Verify signature
        body = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
        expected_sig = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, data.razorpay_signature):
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = "Signature verification failed"
            await self.payment_repo.db.flush()
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        payment.razorpay_payment_id = data.razorpay_payment_id
        payment.razorpay_signature = data.razorpay_signature
        payment.status = PaymentStatus.PAID

        # Update order status
        order = await self.order_repo.get_by_id(payment.order_id)  # type: ignore
        if order:
            order.status = OrderStatus.CONFIRMED

        await self.payment_repo.db.flush()
        return payment

    async def request_refund(self, user_id: UUID, data: RefundRequest) -> Payment:
        payment = await self.payment_repo.get_by_id(data.payment_id)
        if not payment or payment.user_id != user_id:
            raise HTTPException(status_code=404, detail="Payment not found")
        if payment.status != PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Payment is not eligible for refund")

        refund_amount = data.amount or payment.amount
        refund_paise = int(refund_amount * 100)

        refund = self.client.payment.refund(
            payment.razorpay_payment_id,
            {"amount": refund_paise},
        )

        payment.refund_id = refund["id"]
        payment.refund_amount = refund_amount
        payment.status = (
            PaymentStatus.REFUNDED if refund_amount >= payment.amount
            else PaymentStatus.PARTIALLY_REFUNDED
        )

        order = await self.order_repo.get_by_id(payment.order_id)  # type: ignore
        if order and refund_amount >= payment.amount:
            order.status = OrderStatus.REFUNDED

        await self.payment_repo.db.flush()
        return payment

    async def get_history(self, user_id: UUID, page: int = 1, page_size: int = 10) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        payments, total = await self.payment_repo.get_user_payments(user_id, skip, limit)
        return {"items": payments, **paginate(total, page, page_size)}
