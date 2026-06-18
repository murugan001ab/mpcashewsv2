import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Product, ProductImage


async def seed_product_images():
    async with AsyncSessionLocal() as session:
        products = (
            await session.execute(select(Product))
        ).scalars().all()

        print("hello")
        print(products)

        for product in products:
            existing = (
                await session.execute(
                    select(ProductImage).where(
                        ProductImage.product_id == product.id
                    )
                )
            ).scalars().first()

            if existing:
                print(f"Images already exist for {product.name}")
                continue

            images = [
                ProductImage(
                    product_id=product.id,
                    url=f"https://picsum.photos/seed/{product.slug}-1/800/800",
                    alt_text=f"{product.name} Front View",
                    is_primary=True,
                    sort_order=1,
                ),
                ProductImage(
                    product_id=product.id,
                    url=f"https://picsum.photos/seed/{product.slug}-2/800/800",
                    alt_text=f"{product.name} Side View",
                    sort_order=2,
                ),
                ProductImage(
                    product_id=product.id,
                    url=f"https://picsum.photos/seed/{product.slug}-3/800/800",
                    alt_text=f"{product.name} Package View",
                    sort_order=3,
                ),
                ProductImage(
                    product_id=product.id,
                    url=f"https://picsum.photos/seed/{product.slug}-4/800/800",
                    alt_text=f"{product.name} Closeup View",
                    sort_order=4,
                ),
            ]

            session.add_all(images)

        await session.commit()
        print("✅ Product images seeded")


if __name__ == "__main__":
    asyncio.run(seed_product_images())