from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductListResponse, PaginatedProducts, ProductImageResponse,
    ProductVariantCreate, ProductVariantUpdate, ProductVariantResponse,
)
from app.services.product import ProductService, ProductVariantService

router = APIRouter()


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedProducts)
async def list_products(
    q: Optional[str] = Query(None, description="Search query"),
    category_id: Optional[UUID] = Query(None),
    is_featured: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List / search products with pagination (public)."""
    service = ProductService(db)
    return await service.get_list(
        query=q,
        category_id=category_id,
        is_featured=is_featured,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: create product with optional initial variants."""
    service = ProductService(db)
    return await service.create(data)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single product with all its variants (public)."""
    service = ProductService(db)
    return await service.get_by_id(product_id)


@router.get("/slug/{slug}", response_model=ProductResponse)
async def get_product_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    service = ProductService(db)
    return await service.get_by_slug(slug)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: update product fields (not variants)."""
    service = ProductService(db)
    return await service.update(product_id, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: delete product and cascade-delete all its variants."""
    service = ProductService(db)
    await service.delete(product_id)


# ---------------------------------------------------------------------------
# Product Images
# ---------------------------------------------------------------------------

@router.post(
    "/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_product_image(
    product_id: UUID,
    file: UploadFile = File(...),
    is_primary: bool = False,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: upload a product image."""
    service = ProductService(db)
    return await service.upload_image(product_id, file, is_primary)


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_image(
    product_id: UUID,
    image_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    service = ProductService(db)
    await service.delete_image(product_id, image_id)


# ---------------------------------------------------------------------------
# Product Variants (nested under /products/{product_id}/variants)
# ---------------------------------------------------------------------------

@router.post(
    "/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_variant(
    product_id: UUID,
    data: ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: add a new variant to an existing product."""
    service = ProductVariantService(db)
    return await service.create(product_id, data)


@router.get("/{product_id}/variants", response_model=List[ProductVariantResponse])
async def list_variants(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all variants for a product (public)."""
    service = ProductVariantService(db)
    return await service.get_by_product(product_id)


# ---------------------------------------------------------------------------
# Variant management (standalone /variants/{variant_id} routes)
# ---------------------------------------------------------------------------

variants_router = APIRouter()


@variants_router.patch("/{variant_id}", response_model=ProductVariantResponse)
async def update_variant(
    variant_id: UUID,
    data: ProductVariantUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: update a specific variant."""
    service = ProductVariantService(db)
    return await service.update(variant_id, data)


@variants_router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: delete a specific variant."""
    service = ProductVariantService(db)
    await service.delete(variant_id)
