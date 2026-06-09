import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.delivery import DeliveryStatus


class ShipmentCreate(BaseModel):
    order_id: uuid.UUID


class DeliveryResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    shiprocket_order_id: Optional[str]
    shiprocket_shipment_id: Optional[str]
    awb_code: Optional[str]
    courier_name: Optional[str]
    courier_tracking_url: Optional[str]
    status: DeliveryStatus
    estimated_delivery: Optional[datetime]
    delivered_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrackingResponse(BaseModel):
    awb_code: str
    current_status: str
    courier_name: str
    tracking_url: Optional[str]
    activities: list
