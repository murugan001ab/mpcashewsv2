import uuid
from decimal import Decimal
from typing import List
from pydantic import BaseModel

from app.schemas.product import ProductListResponse


class CartItemAdd(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: uuid.UUID
    product: ProductListResponse
    quantity: int
    price_at_add: Decimal
    subtotal: Decimal

    model_config = {"from_attributes": True}


class CartSummary(BaseModel):
    cart_id: uuid.UUID
    items: List[CartItemResponse]
    item_count: int
    subtotal: Decimal
    tax: Decimal
    shipping: Decimal
    total: Decimal
