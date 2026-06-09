from datetime import datetime, timezone
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import OrderStatus
from app.repositories.delivery import DeliveryRepository
from app.repositories.order import OrderRepository


class DeliveryService:
    def __init__(self, db: AsyncSession):
        self.delivery_repo = DeliveryRepository(db)
        self.order_repo = OrderRepository(db)
        self._token: str | None = None

    async def _get_token(self) -> str:
        if self._token:
            return self._token
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.SHIPROCKET_API_URL}/auth/login",
                json={"email": settings.SHIPROCKET_EMAIL, "password": settings.SHIPROCKET_PASSWORD},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail="Shiprocket authentication failed")
            self._token = resp.json().get("token")
        return self._token

    async def create_shipment(self, order_id: UUID) -> Delivery:
        order = await self.order_repo.get_with_relations(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.CONFIRMED:
            raise HTTPException(status_code=400, detail="Order must be confirmed before shipping")

        existing = await self.delivery_repo.get_by_order(order_id)
        if existing and existing.status not in (DeliveryStatus.PENDING, DeliveryStatus.FAILED):
            raise HTTPException(status_code=400, detail="Shipment already created")

        token = await self._get_token()
        address = order.address
        items_payload = [
            {
                "name": item.product_name,
                "sku": item.product_sku,
                "units": item.quantity,
                "selling_price": str(item.unit_price),
            }
            for item in order.items
        ]

        payload = {
            "order_id": order.order_number,
            "order_date": order.created_at.strftime("%Y-%m-%d %H:%M"),
            "pickup_location": "Primary",
            "billing_customer_name": address.full_name,
            "billing_address": address.address_line1,
            "billing_city": address.city,
            "billing_pincode": address.postal_code,
            "billing_state": address.state,
            "billing_country": address.country,
            "billing_email": order.user.email if hasattr(order, "user") else "",
            "billing_phone": address.phone,
            "shipping_is_billing": True,
            "order_items": items_payload,
            "payment_method": "Prepaid",
            "sub_total": str(order.total_amount),
            "length": 10,
            "breadth": 10,
            "height": 10,
            "weight": sum(
                (item.quantity * 0.25) for item in order.items
            ),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.SHIPROCKET_API_URL}/orders/create/adhoc",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code not in (200, 201):
            # Still create local delivery record in PENDING state for retry
            if not existing:
                delivery = Delivery(order_id=order_id, status=DeliveryStatus.PENDING)
                delivery = await self.delivery_repo.create(delivery)
            raise HTTPException(status_code=502, detail="Shiprocket order creation failed")

        data = resp.json()
        if existing:
            delivery = existing
        else:
            delivery = Delivery(order_id=order_id)

        delivery.shiprocket_order_id = str(data.get("order_id", ""))
        delivery.shiprocket_shipment_id = str(data.get("shipment_id", ""))
        delivery.awb_code = data.get("awb_code")
        delivery.courier_name = data.get("courier_name")
        delivery.status = DeliveryStatus.PICKUP_SCHEDULED

        order.status = OrderStatus.PROCESSING
        if not existing:
            delivery = await self.delivery_repo.create(delivery)
        await self.delivery_repo.db.flush()
        return delivery

    async def track_shipment(self, order_id: UUID) -> dict:
        delivery = await self.delivery_repo.get_by_order(order_id)
        if not delivery or not delivery.awb_code:
            raise HTTPException(status_code=404, detail="Shipment not found or not yet assigned AWB")

        token = await self._get_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.SHIPROCKET_API_URL}/courier/track/awb/{delivery.awb_code}",
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Tracking fetch failed")

        tracking = resp.json()
        activities = tracking.get("tracking_data", {}).get("shipment_track_activities", [])

        return {
            "awb_code": delivery.awb_code,
            "current_status": delivery.status,
            "courier_name": delivery.courier_name,
            "tracking_url": delivery.courier_tracking_url,
            "activities": activities,
        }

    async def update_status(self, order_id: UUID, new_status: DeliveryStatus) -> Delivery:
        delivery = await self.delivery_repo.get_by_order(order_id)
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")

        delivery.status = new_status
        if new_status == DeliveryStatus.DELIVERED:
            delivery.delivered_at = datetime.now(timezone.utc)
            order = await self.order_repo.get_by_id(delivery.order_id)  # type: ignore
            if order:
                order.status = OrderStatus.DELIVERED

        await self.delivery_repo.db.flush()
        return delivery

    async def get_by_order(self, order_id: UUID) -> Delivery:
        delivery = await self.delivery_repo.get_by_order(order_id)
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        return delivery
