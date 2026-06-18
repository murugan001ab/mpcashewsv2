import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Category


CATEGORIES = [
    {
        "name": "Whole Cashews",
        "slug": "whole-cashews",
        "description": "Premium whole cashew kernels including W180, W210, W240, W320, W450, and W500 grades.",
        "image_url": "https://example.com/images/categories/whole-cashews.jpg"
    },
    {
        "name": "Scorched Cashews",
        "slug": "scorched-cashews",
        "description": "Scorched cashew kernels with a light brown appearance due to processing.",
        "image_url": "https://example.com/images/categories/scorched-cashews.jpg"
    },
    {
        "name": "Splits",
        "slug": "cashew-splits",
        "description": "Cashew kernels naturally split into halves, commonly used in snacks and food processing.",
        "image_url": "https://example.com/images/categories/splits.jpg"
    },
    {
        "name": "Butts",
        "slug": "cashew-butts",
        "description": "Cashew kernels broken across the width, suitable for confectionery and industrial use.",
        "image_url": "https://example.com/images/categories/butts.jpg"
    },
    {
        "name": "Pieces",
        "slug": "cashew-pieces",
        "description": "Broken cashew pieces such as LWP, SWP, and Baby Bits used in baking and cooking.",
        "image_url": "https://example.com/images/categories/pieces.jpg"
    },
    {
        "name": "Value Added Products",
        "slug": "value-added-cashew-products",
        "description": "Processed cashew products including roasted, salted, flavored cashews, powders, and pastes.",
        "image_url": "https://example.com/images/categories/value-added-products.jpg"
    }
]


async def seed_categories():
    async with AsyncSessionLocal() as session:
        try:
            for item in CATEGORIES:
                result = await session.execute(
                    select(Category).where(Category.slug == item["slug"])
                )

                if result.scalar_one_or_none():
                    print(f"Category exists: {item['name']}")
                    continue

                category = Category(**item)
                session.add(category)

            await session.commit()
            print("✅ Categories seeded successfully")

        except Exception:
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_categories())