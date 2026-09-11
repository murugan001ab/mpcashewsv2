from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.user import User
from app.schemas.product import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryReorder
from app.services.product import CategoryService

router = APIRouter()


@router.get("", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all active categories."""
    service = CategoryService(db)
    return await service.get_all()


# NOTE: this must be registered BEFORE PATCH /{category_id} below. Both are
# PATCH on the same router, and FastAPI/Starlette matches routes in
# registration order — if the {category_id} route came first, a request to
# /categories/reorder would match it with category_id="reorder" and 422 on
# the UUID parse instead of ever reaching this handler.
@router.patch("/reorder", response_model=List[CategoryResponse])
async def reorder_categories(
    data: CategoryReorder,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Admin only: set the display order of all categories by passing the full
    list of category IDs in the desired order. This controls which category
    shows first on the storefront.
    """
    service = CategoryService(db)
    return await service.reorder(data.category_ids)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: UUID, db: AsyncSession = Depends(get_db)):
    service = CategoryService(db)
    return await service.get_by_id(category_id)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin only: create a new category."""
    service = CategoryService(db)
    return await service.create(data)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    service = CategoryService(db)
    return await service.update(category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    service = CategoryService(db)
    await service.delete(category_id)
