from typing import Optional, List
from pydantic import BaseModel

from app.schemas.product import ProductListResponse


class WishlistItemResponse(BaseModel):
    id: str
    product: ProductListResponse

    model_config = {"from_attributes": True}


class WishlistResponse(BaseModel):
    id: str
    items: List[WishlistItemResponse] = []
    total: int

    model_config = {"from_attributes": True}


class WishlistAddRequest(BaseModel):
    product_id: str
