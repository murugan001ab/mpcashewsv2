"""One-off schema patch for the address-management upgrade.

This repo doesn't have Alembic wired up yet (no migrations/ folder), so
existing tables were created once by hand / via create_all and are now
patched with plain ALTER TABLE statements, same spirit as the other
one-off scripts in this folder. Safe to run multiple times — every
statement is IF NOT EXISTS / guarded.

Run with:  python -m app.scripts.migrate_address_fields
"""
import asyncio

from sqlalchemy import text

from app.core.database import engine


STATEMENTS = [
    "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark VARCHAR(255)",
    "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS district VARCHAR(100)",
    "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_type VARCHAR(20) DEFAULT 'home'",
    "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
    "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
    # Backfill any existing rows that predate address_type.
    "UPDATE addresses SET address_type = 'home' WHERE address_type IS NULL",
]


async def migrate():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt}")
            await conn.execute(text(stmt))
    print("✅ addresses table patched with landmark/district/address_type/latitude/longitude")


if __name__ == "__main__":
    asyncio.run(migrate())
