import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# Category schemas
# ---------------------------------------------------------------------------

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: uuid.UUID
    slug: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ProductImage schemas
# ---------------------------------------------------------------------------

class ProductImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    alt_text: Optional[str] = None
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ProductVariant schemas
# ---------------------------------------------------------------------------

class ProductVariantCreate(BaseModel):
    sku: str
    weight_grams: int
    price: Decimal
    discounted_price: Optional[Decimal] = None
    stock: int = 0
    is_active: bool = True

    @field_validator("price", "discounted_price", mode="before")
    @classmethod
    def validate_price(cls, v):
        if v is not None and v < 0:
            raise ValueError("Price must be non-negative")
        return v

    @field_validator("stock", mode="before")
    @classmethod
    def validate_stock(cls, v):
        if v < 0:
            raise ValueError("Stock must be non-negative")
        return v

    @field_validator("weight_grams", mode="before")
    @classmethod
    def validate_weight(cls, v):
        if v <= 0:
            raise ValueError("weight_grams must be positive")
        return v


class ProductVariantUpdate(BaseModel):
    sku: Optional[str] = None
    weight_grams: Optional[int] = None
    price: Optional[Decimal] = None
    discounted_price: Optional[Decimal] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None


class ProductVariantResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    sku: str
    weight_grams: int
    price: Decimal
    discounted_price: Optional[Decimal] = None
    stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Product schemas
# ---------------------------------------------------------------------------

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    is_featured: bool = False
    category_id: uuid.UUID


class ProductCreate(ProductBase):
    """Create a product and its initial variants in one request."""
    variants: List[ProductVariantCreate] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None


class ProductResponse(ProductBase):
    id: uuid.UUID
    slug: str
    is_active: bool
    category: CategoryResponse
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    is_featured: bool
    category: CategoryResponse
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []

    model_config = {"from_attributes": True}


class PaginatedProducts(BaseModel):
    items: List[ProductListResponse]
    total: int
    page: int
    page_size: int
    pages: int
