import uuid
from typing import List
from pydantic import BaseModel, model_validator

from app.schemas.product import ProductListResponse


class WishlistItemResponse(BaseModel):
    id: uuid.UUID
    product: ProductListResponse

    model_config = {"from_attributes": True}


class WishlistResponse(BaseModel):
    id: uuid.UUID
    items: List[WishlistItemResponse] = []
    total: int = 0

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_total(self) -> "WishlistResponse":
        self.total = len(self.items)
        return self


class WishlistAddRequest(BaseModel):
    product_id: str