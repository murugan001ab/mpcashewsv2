from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_admin
from app.models.order import OrderStatus
from app.models.user import User
from app.schemas.admin import DashboardStats, RevenueByMonth, TopProduct, InventoryReport
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponResponse, PaginatedCoupons
from app.schemas.order import OrderResponse, OrderStatusUpdate, PaginatedOrders
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
)
from app.schemas.review import ReviewResponse, ReviewAdminReply, PaginatedReviews
from app.schemas.blog import BlogPostCreate, BlogPostUpdate, BlogPostResponse, PaginatedBlogPostsAdmin
from app.schemas.settings import SiteSettingsResponse, SiteSettingsUpdate
from app.schemas.template import (
    EmailTemplateUpsert, EmailTemplateUpdate, EmailTemplateResponse,
    WhatsAppTemplateUpdate, WhatsAppTemplateResponse,
)
from app.schemas.upload import ImageUploadResponse
from app.schemas.user import UserResponse
from app.services.admin import AdminService
from app.services.coupon import CouponService
from app.services.order import OrderService
from app.services.product import ProductService, CategoryService
from app.services.review import ReviewService
from app.services.blog import BlogService
from app.services.settings import SettingsService
from app.services.template import TemplateService
from app.utils.imagekit import upload_image as ik_upload_image

router = APIRouter()


# ---------------------------------------------------------------------------
# Generic image upload (ImageKit) — used for category images and anywhere
# else the admin UI needs a bare image URL rather than a resource-attached
# one (product images instead go through /products/{id}/images, since those
# are tracked as their own DB rows for ordering/primary/delete).
# ---------------------------------------------------------------------------

@router.post("/upload/image", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Query("misc", description="ImageKit folder, e.g. 'categories'"),
    _: User = Depends(get_current_admin),
):
    """Admin only: upload an image to ImageKit and get back a CDN URL.
    Use the returned `url` as `image_url` when creating/updating a category."""
    url, file_id = await ik_upload_image(file, folder=folder)
    return ImageUploadResponse(url=url, file_id=file_id)


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
# Admin: Coupon CRUD (festival / promoter discount codes)
# ---------------------------------------------------------------------------

@router.get("/coupons", response_model=PaginatedCoupons)
async def list_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all coupons (paginated)."""
    service = CouponService(db)
    return await service.list_all(page, page_size)


@router.post("/coupons", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    data: CouponCreate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new coupon, e.g. a festival-sale or promoter-given code.
    Set usage_limit_total / usage_limit_per_user to cap how many times it
    can be used overall and per user; leave either null for unlimited."""
    service = CouponService(db)
    return await service.create(data)


@router.get("/coupons/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single coupon by ID."""
    service = CouponService(db)
    return await service.get_by_id(coupon_id)


@router.patch("/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: UUID,
    data: CouponUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a coupon — including toggling is_active to pause/resume it."""
    service = CouponService(db)
    return await service.update(coupon_id, data)


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a coupon."""
    service = CouponService(db)
    await service.delete(coupon_id)


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
    result = await service.get_list(page=page, page_size=page_size, include_inactive=True)
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


# ---------------------------------------------------------------------------
# Admin: Review moderation
# ---------------------------------------------------------------------------

@router.get("/reviews", response_model=PaginatedReviews)
async def list_all_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_approved: Optional[bool] = Query(None, description="Filter by approval status"),
    product_id: Optional[UUID] = Query(None, description="Filter by product"),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all reviews (approved + pending), optionally filtered."""
    service = ReviewService(db)
    return await service.admin_list(page, page_size, is_approved, product_id)


@router.patch("/reviews/{review_id}/approve", response_model=ReviewResponse)
async def approve_review(
    review_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve a review so it becomes publicly visible."""
    service = ReviewService(db)
    return await service.admin_set_approved(review_id, True)


@router.patch("/reviews/{review_id}/reject", response_model=ReviewResponse)
async def reject_review(
    review_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hide a review from public view without deleting it."""
    service = ReviewService(db)
    return await service.admin_set_approved(review_id, False)


@router.patch("/reviews/{review_id}/reply", response_model=ReviewResponse)
async def reply_to_review(
    review_id: UUID,
    data: ReviewAdminReply,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Post an official admin reply under a review."""
    service = ReviewService(db)
    return await service.admin_reply(review_id, data.admin_reply)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_admin(
    review_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a review (e.g. spam/abuse)."""
    service = ReviewService(db)
    await service.admin_delete(review_id)


# ---------------------------------------------------------------------------
# Admin: Blog CRUD
# ---------------------------------------------------------------------------

@router.get("/blog", response_model=PaginatedBlogPostsAdmin)
async def list_all_blog_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_published: Optional[bool] = Query(None, description="Filter by published/draft"),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all blog posts (drafts included) for admin management."""
    service = BlogService(db)
    return await service.admin_list(page, page_size, is_published)


@router.post("/blog", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
async def create_blog_post(
    data: BlogPostCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new blog post (draft or published)."""
    service = BlogService(db)
    return await service.create(admin.id, data)


@router.get("/blog/{post_id}", response_model=BlogPostResponse)
async def get_blog_post_admin(
    post_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single blog post (including drafts) by ID, for editing."""
    service = BlogService(db)
    return await service.admin_get(post_id)


@router.patch("/blog/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    post_id: UUID,
    data: BlogPostUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a blog post — including toggling is_published to go live."""
    service = BlogService(db)
    return await service.update(post_id, data)


@router.delete("/blog/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    post_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a blog post."""
    service = BlogService(db)
    await service.delete(post_id)


# ---------------------------------------------------------------------------
# Admin: Site settings (footer / contact / legal info)
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=SiteSettingsResponse)
async def get_site_settings_admin(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get the current site settings (address, FSSAI, GSTIN, contact,
    socials, trademark/copyright text) for editing in the admin panel."""
    service = SettingsService(db)
    return await service.get()


@router.patch("/settings", response_model=SiteSettingsResponse)
async def update_site_settings(
    data: SiteSettingsUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update any subset of site settings. Only fields included in the
    request body are changed — this powers the WordPress-style 'footer /
    business info' admin screen (address, FSSAI license, GSTIN, contact
    details, social links, trademark & copyright text)."""
    service = SettingsService(db)
    return await service.update(data)


# ---------------------------------------------------------------------------
# Admin: Email templates
# ---------------------------------------------------------------------------

@router.get("/templates/email", response_model=list[EmailTemplateResponse])
async def list_email_templates(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all admin-editable email templates."""
    service = TemplateService(db)
    return await service.list_email_templates()


@router.get("/templates/email/{key}", response_model=EmailTemplateResponse)
async def get_email_template(
    key: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single email template by its key (e.g. 'verification_email')."""
    service = TemplateService(db)
    return await service.get_email_template(key)


@router.put("/templates/email/{key}", response_model=EmailTemplateResponse)
async def upsert_email_template(
    key: str,
    data: EmailTemplateUpsert,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or fully replace an email template for the given key."""
    service = TemplateService(db)
    return await service.upsert_email_template(key, data)


@router.patch("/templates/email/{key}", response_model=EmailTemplateResponse)
async def update_email_template(
    key: str,
    data: EmailTemplateUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Partially update an existing email template."""
    service = TemplateService(db)
    return await service.update_email_template(key, data)


@router.delete("/templates/email/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_template(
    key: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete an email template. The notification code falls back to its
    hardcoded default if this key is ever sent for again after deletion."""
    service = TemplateService(db)
    await service.delete_email_template(key)


# ---------------------------------------------------------------------------
# Admin: WhatsApp templates
# ---------------------------------------------------------------------------
# Note: WhatsApp template *bodies* are pre-approved by Meta and can't be
# edited here — admins can only repoint which approved template name /
# language a given system event uses. Keys are fixed to what the codebase
# actually fires (see app/services/whatsapp.py), so there's no create/delete,
# only list/get/update.

@router.get("/templates/whatsapp", response_model=list[WhatsAppTemplateResponse])
async def list_whatsapp_templates(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all WhatsApp event-to-template mappings."""
    service = TemplateService(db)
    return await service.list_whatsapp_templates()


@router.get("/templates/whatsapp/{key}", response_model=WhatsAppTemplateResponse)
async def get_whatsapp_template(
    key: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a single WhatsApp template mapping by its event key."""
    service = TemplateService(db)
    return await service.get_whatsapp_template(key)


@router.patch("/templates/whatsapp/{key}", response_model=WhatsAppTemplateResponse)
async def update_whatsapp_template(
    key: str,
    data: WhatsAppTemplateUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update which approved Meta template name / language an event uses."""
    service = TemplateService(db)
    return await service.update_whatsapp_template(key, data)
