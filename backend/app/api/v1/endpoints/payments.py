from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentVerify,
    RefundRequest,
    RazorpayOrderResponse,
    PaymentResponse,
    PaginatedPayments,
)
from app.services.payment import PaymentService

router = APIRouter()


@router.post("/create", response_model=RazorpayOrderResponse)
async def create_payment_order(
    data: PaymentOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay payment order for a given order."""
    service = PaymentService(db)
    return await service.create_payment_order(current_user.id, data)


@router.post("/verify", response_model=PaymentResponse)
async def verify_payment(
    data: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify a Razorpay payment after checkout."""
    service = PaymentService(db)
    return await service.verify_payment(data)


@router.post("/refund", response_model=PaymentResponse)
async def request_refund(
    data: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request a refund for a paid order."""
    service = PaymentService(db)
    return await service.request_refund(current_user.id, data)


@router.get("/history", response_model=PaginatedPayments)
async def payment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get payment history for the current user."""
    service = PaymentService(db)
    return await service.get_history(current_user.id, page, page_size)
