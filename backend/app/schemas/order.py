import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.order import OrderStatus
from app.schemas.product import ProductListResponse
from app.schemas.address import AddressResponse


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product: ProductListResponse
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    product_name: str
    product_sku: str

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    address_id: uuid.UUID
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    status: OrderStatus
    subtotal: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    notes: Optional[str] = None
    items: List[OrderItemResponse] = []
    address: AddressResponse
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class PaginatedOrders(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
    pages: int
