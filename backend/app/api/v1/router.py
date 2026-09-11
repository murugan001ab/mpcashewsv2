from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    products,
    categories,
    cart,
    wishlist,
    orders,
    payments,
    delivery,
    admin,
    reviews,
    blog,
    settings,
    coupons,
    auth_slides,
)

api_router = APIRouter()

api_router.include_router(auth.router,                    prefix="/auth",       tags=["Authentication"])
api_router.include_router(users.router,                   prefix="/users",      tags=["Users"])
api_router.include_router(products.router,                prefix="/products",   tags=["Products"])
api_router.include_router(products.variants_router,       prefix="/variants",   tags=["Product Variants"])
api_router.include_router(categories.router,              prefix="/categories", tags=["Categories"])
api_router.include_router(cart.router,                    prefix="/cart",       tags=["Cart"])
api_router.include_router(wishlist.router,                prefix="/wishlist",   tags=["Wishlist"])
api_router.include_router(orders.router,                  prefix="/orders",     tags=["Orders"])
api_router.include_router(coupons.router,                  prefix="/coupons",    tags=["Coupons"])
api_router.include_router(payments.router,                prefix="/payments",   tags=["Payments"])
api_router.include_router(delivery.router,                prefix="/delivery",   tags=["Delivery"])
api_router.include_router(admin.router,                   prefix="/admin",      tags=["Admin"])
api_router.include_router(reviews.product_router,          prefix="",            tags=["Reviews"])
api_router.include_router(reviews.router,                  prefix="/reviews",    tags=["Reviews"])
api_router.include_router(blog.router,                     prefix="/blog",       tags=["Blog"])
api_router.include_router(settings.router,                 prefix="/settings",  tags=["Settings"])
api_router.include_router(auth_slides.router,               prefix="/auth-slides", tags=["Auth Slides"])
