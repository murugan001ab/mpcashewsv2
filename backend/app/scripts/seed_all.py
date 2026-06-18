import asyncio

from app.scripts.seed_categories import seed_categories
from app.scripts.seed_products import seed_products


async def main():
    await seed_categories()
    # await seed_products()


if __name__ == "__main__":
    asyncio.run(main())