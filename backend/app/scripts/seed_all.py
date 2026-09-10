import asyncio

from app.scripts.seed_admin import seed_admin
from app.scripts.seed_categories import seed_categories
from app.scripts.seed_products_full import seed_products
from app.scripts.seed_image import seed_product_images


async def main():
    # Order matters: categories before products (products FK into categories),
    # products before images (images FK into products).
    await seed_admin()
    await seed_categories()
    await seed_products()
    await seed_product_images()


if __name__ == "__main__":
    asyncio.run(main())