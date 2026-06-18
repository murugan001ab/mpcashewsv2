import asyncio
import re
from decimal import Decimal

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Product, ProductVariant, Category


async def seed_products():
    async with AsyncSessionLocal() as session:
        try:
            categories = {
                category.slug: category
                for category in (
                    await session.execute(select(Category))
                ).scalars().all()
            }

            products = [
                {
                    "name": "W180 Cashew",
                    "description": "Premium large whole white cashew kernels.",
                    "short_description": "King of Cashews",
                    "is_featured": True,
                    "category_slug": "whole-cashews",
                    "variants": [
                        ("W180-100", 100, "120", "110"),
                        ("W180-250", 250, "290", "275"),
                        ("W180-500", 500, "580", "549"),
                        ("W180-1000", 1000, "1150", "1099"),
                        ("W180-10000", 10000, "11000", "10499"),
                    ],
                },
                {
                    "name": "W240 Cashew",
                    "description": "Premium whole white cashew kernels.",
                    "short_description": "Popular Export Grade",
                    "is_featured": True,
                    "category_slug": "whole-cashews",
                    "variants": [
                        ("W240-100", 100, "110", "99"),
                        ("W240-250", 250, "265", "249"),
                        ("W240-500", 500, "520", "499"),
                        ("W240-1000", 1000, "999", "949"),
                        ("W240-10000", 10000, "9500", "8999"),
                    ],
                },
                {
                    "name": "W320 Cashew",
                    "description": "Most popular whole cashew grade.",
                    "short_description": "Best Seller",
                    "is_featured": True,
                    "category_slug": "whole-cashews",
                    "variants": [
                        ("W320-100", 100, "95", "89"),
                        ("W320-250", 250, "225", "210"),
                        ("W320-500", 500, "450", "425"),
                        ("W320-1000", 1000, "899", "849"),
                        ("W320-10000", 10000, "8500", "7999"),
                    ],
                },
                {
                    "name": "W450 Cashew",
                    "description": "Medium whole cashew kernels.",
                    "short_description": "Economy Grade",
                    "is_featured": False,
                    "category_slug": "whole-cashews",
                    "variants": [
                        ("W450-100", 100, "85", "79"),
                        ("W450-250", 250, "205", "190"),
                        ("W450-500", 500, "410", "389"),
                        ("W450-1000", 1000, "799", "749"),
                        ("W450-10000", 10000, "7600", "7199"),
                    ],
                },
                {
                    "name": "Cashew Splits",
                    "description": "Naturally split cashew kernels.",
                    "short_description": "Economical Choice",
                    "is_featured": False,
                    "category_slug": "cashew-splits",
                    "variants": [
                        ("SPLIT-100", 100, "80", "75"),
                        ("SPLIT-250", 250, "190", "180"),
                        ("SPLIT-500", 500, "375", "350"),
                        ("SPLIT-1000", 1000, "730", "699"),
                        ("SPLIT-10000", 10000, "6900", "6499"),
                    ],
                },
                {
                    "name": "Cashew Butts",
                    "description": "Broken kernels ideal for bakery and sweets.",
                    "short_description": "Confectionery Grade",
                    "is_featured": False,
                    "category_slug": "cashew-butts",
                    "variants": [
                        ("BUTT-100", 100, "75", "70"),
                        ("BUTT-250", 250, "180", "170"),
                        ("BUTT-500", 500, "350", "330"),
                        ("BUTT-1000", 1000, "680", "649"),
                        ("BUTT-10000", 10000, "6500", "5999"),
                    ],
                },
                {
                    "name": "LWP Cashew Pieces",
                    "description": "Large white cashew pieces.",
                    "short_description": "Cooking & Baking",
                    "is_featured": False,
                    "category_slug": "cashew-pieces",
                    "variants": [
                        ("LWP-100", 100, "70", "65"),
                        ("LWP-250", 250, "165", "155"),
                        ("LWP-500", 500, "320", "299"),
                        ("LWP-1000", 1000, "620", "599"),
                        ("LWP-10000", 10000, "5900", "5499"),
                    ],
                },
                {
                    "name": "Roasted Cashew",
                    "description": "Crunchy roasted cashew kernels.",
                    "short_description": "Ready To Eat",
                    "is_featured": True,
                    "category_slug": "value-added-cashew-products",
                    "variants": [
                        ("ROAST-100", 100, "130", "120"),
                        ("ROAST-250", 250, "320", "299"),
                        ("ROAST-500", 500, "620", "599"),
                        ("ROAST-1000", 1000, "1200", "1149"),
                        ("ROAST-10000", 10000, "11500", "10999"),
                    ],
                },
            ]

            for item in products:
                category = categories.get(item["category_slug"])

                if not category:
                    print(f"❌ Category not found: {item['category_slug']}")
                    continue

                slug = re.sub(
                    r"[^a-z0-9-]",
                    "",
                    item["name"]
                    .lower()
                    .replace(" ", "-")
                    .replace("&", "and"),
                )

                product = await session.scalar(
                    select(Product).where(Product.slug == slug)
                )

                if not product:
                    product = Product(
                        name=item["name"],
                        slug=slug,
                        description=item["description"],
                        short_description=item["short_description"],
                        is_featured=item["is_featured"],
                        category_id=category.id,
                    )

                    session.add(product)
                    await session.flush()

                    print(f"✅ Created product: {product.name}")
                else:
                    print(f"ℹ️ Product exists: {product.name}")

                for sku, weight, price, discounted_price in item["variants"]:
                    existing_variant = await session.scalar(
                        select(ProductVariant).where(
                            ProductVariant.sku == sku
                        )
                    )

                    if existing_variant:
                        print(f"   ↳ Variant exists: {sku}")
                        continue

                    session.add(
                        ProductVariant(
                            product_id=product.id,
                            sku=sku,
                            weight_grams=weight,
                            price=Decimal(price),
                            discounted_price=Decimal(discounted_price),
                            stock=100,
                            is_active=True,
                        )
                    )

                    print(f"   ↳ Added variant: {sku}")

            await session.commit()
            print("✅ Products and variants seeded successfully")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_products())