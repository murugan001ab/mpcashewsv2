from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, PaginatedOrders
from app.services.order import OrderService

router = APIRouter()


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new order from the current cart."""
    service = OrderService(db)
    return await service.create_order(current_user.id, data)


@router.get("", response_model=PaginatedOrders)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all orders for the current user."""
    service = OrderService(db)
    return await service.get_user_orders(current_user.id, page, page_size)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific order by ID."""
    service = OrderService(db)
    return await service.get_order(current_user.id, order_id)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending or confirmed order."""
    service = OrderService(db)
    return await service.cancel_order(current_user.id, order_id)
