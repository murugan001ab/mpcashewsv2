import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User,UserRole
from app.core.security import hash_password


async def seed_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "admin@mpcashews.com")
        )

        existing_user = result.scalar_one_or_none()

        if existing_user:
            print("Admin already exists")
            return

        admin = User(
            email="admin@mpcashews.com",
            full_name="System Admin",
            hashed_password=hash_password("Admin@123"),
            is_active=True,
            role=UserRole.ADMIN,
            is_verified=True,
        )

        db.add(admin)
        await db.commit()

        print("Admin created successfully")


if __name__ == "__main__":
    asyncio.run(seed_admin())