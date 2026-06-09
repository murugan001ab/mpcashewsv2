import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


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


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    alt_text: Optional[str] = None
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Decimal
    discounted_price: Optional[Decimal] = None
    stock: int = 0
    sku: str
    weight_grams: Optional[int] = None
    is_featured: bool = False
    category_id: uuid.UUID


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[Decimal] = None
    discounted_price: Optional[Decimal] = None
    stock: Optional[int] = None
    weight_grams: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None


class ProductResponse(ProductBase):
    id: uuid.UUID
    slug: str
    is_active: bool
    category: CategoryResponse
    images: List[ProductImageResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    price: Decimal
    discounted_price: Optional[Decimal] = None
    stock: int
    is_active: bool
    is_featured: bool
    category: CategoryResponse
    images: List[ProductImageResponse] = []

    model_config = {"from_attributes": True}


class PaginatedProducts(BaseModel):
    items: List[ProductListResponse]
    total: int
    page: int
    page_size: int
    pages: int
