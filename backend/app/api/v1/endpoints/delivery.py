from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_admin, get_current_user
from app.models.user import User
from app.schemas.delivery import DeliveryResponse, TrackingResponse
from app.services.delivery import DeliveryService

router = APIRouter()


@router.get("/{order_id}", response_model=DeliveryResponse)
async def get_delivery(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery details for an order."""
    service = DeliveryService(db)
    return await service.get_by_order(order_id)


@router.get("/{order_id}/track", response_model=TrackingResponse)
async def track_delivery(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get live tracking info for an order's shipment."""
    service = DeliveryService(db)
    return await service.track_shipment(order_id)


@router.post("/{order_id}/ship", response_model=DeliveryResponse)
async def create_shipment(
    order_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: Create a Shiprocket shipment for a confirmed order."""
    service = DeliveryService(db)
    return await service.create_shipment(order_id)
