from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.order import OrderStatus
from app.models.user import User
from app.schemas.admin import DashboardStats, RevenueByMonth, TopProduct, InventoryReport
from app.schemas.order import OrderResponse, OrderStatusUpdate, PaginatedOrders
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
)
from app.schemas.user import UserResponse
from app.services.admin import AdminService
from app.services.order import OrderService
from app.services.product import ProductService, CategoryService

router = APIRouter()


# ---------------------------------------------------------------------------
# Dashboard & reporting
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get overall dashboard statistics."""
    service = AdminService(db)
    return await service.get_dashboard_stats()


@router.get("/revenue", response_model=list[RevenueByMonth])
async def revenue_by_month(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get monthly revenue breakdown."""
    service = AdminService(db)
    return await service.get_revenue_by_month()


@router.get("/top-products", response_model=list[TopProduct])
async def top_products(
    limit: int = Query(10, ge=1, le=50),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get top-selling products."""
    service = AdminService(db)
    return await service.get_top_products(limit)


@router.get("/inventory", response_model=list[InventoryReport])
async def inventory_report(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get inventory status report."""
    service = AdminService(db)
    return await service.get_inventory_report()


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (paginated)."""
    service = AdminService(db)
    return await service.get_all_users(page, page_size)


@router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable a user account."""
    service = AdminService(db)
    return await service.toggle_user_active(user_id)


# ---------------------------------------------------------------------------
# Order management
# ---------------------------------------------------------------------------

@router.get("/orders", response_model=PaginatedOrders)
async def list_all_orders(
    status: Optional[OrderStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all orders, optionally filtered by status."""
    service = AdminService(db)
    return await service.get_all_orders(status, page, page_size)


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    tracking_id: Optional[str] = Query(None, description="Courier tracking ID (used for shipped status)"),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update the status of any order. WhatsApp notification is sent automatically."""
    service = OrderService(db)
    return await service.update_status(order_id, data.status, tracking_id=tracking_id or "N/A")


# ---------------------------------------------------------------------------
# Admin: Category CRUD
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List ALL categories including inactive ones."""
    service = CategoryService(db)
    return await service.get_all_for_admin()


@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single category by ID."""
    service = CategoryService(db)
    return await service.get_by_id(category_id)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product category."""
    service = CategoryService(db)
    return await service.create(data)


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a category (name, description, image, or active status)."""
    service = CategoryService(db)
    return await service.update(category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a category."""
    service = CategoryService(db)
    await service.delete(category_id)


# ---------------------------------------------------------------------------
# Admin: Product CRUD
# ---------------------------------------------------------------------------

@router.get("/products", response_model=list[ProductResponse])
async def list_all_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all products (including inactive ones) for admin management."""
    service = ProductService(db)
    result = await service.get_list(page=page, page_size=page_size)
    return result["items"]


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product."""
    service = ProductService(db)
    return await service.create(data)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single product by ID."""
    service = ProductService(db)
    return await service.get_by_id(product_id)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a product."""
    service = ProductService(db)
    return await service.update(product_id, data)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a product."""
    service = ProductService(db)
    await service.delete(product_id)
