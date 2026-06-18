import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Category, Product


async def seed_products():
    async with AsyncSessionLocal() as session:
        try:
            cashew = await session.scalar(
                select(Category).where(Category.slug == "cashew-nuts")
            )

            almonds = await session.scalar(
                select(Category).where(Category.slug == "almonds")
            )

            if not cashew or not almonds:
                print("❌ Seed categories first")
                return

            products = [
                {
                    "name": "W180 Premium Cashew",
                    "slug": "w180-premium-cashew",
                    "price": Decimal("950.00"),
                    "discounted_price": Decimal("899.00"),
                    "stock": 100,
                    "sku": "CAS-W180",
                    "weight_grams": 1000,
                    "category_id": cashew.id,
                },
                {
                    "name": "W240 Cashew",
                    "slug": "w240-cashew",
                    "price": Decimal("850.00"),
                    "discounted_price": Decimal("799.00"),
                    "stock": 120,
                    "sku": "CAS-W240",
                    "weight_grams": 1000,
                    "category_id": cashew.id,
                },
                {
                    "name": "Premium Almond",
                    "slug": "premium-almond",
                    "price": Decimal("700.00"),
                    "discounted_price": Decimal("650.00"),
                    "stock": 200,
                    "sku": "ALM-001",
                    "weight_grams": 1000,
                    "category_id": almonds.id,
                },
            ]

            for item in products:
                existing = await session.scalar(
                    select(Product).where(Product.slug == item["slug"])
                )

                if existing:
                    print(f"Product exists: {item['name']}")
                    continue

                session.add(Product(**item))

            await session.commit()

            print("✅ Products seeded successfully")

        except Exception:
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_products())