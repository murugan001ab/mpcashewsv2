"""One-off schema patch for the About page + cashew grade filtering upgrade.

Same spirit as migrate_address_fields.py: this repo doesn't have Alembic
wired up (alembic/ and alembic.ini are git-ignored — see .gitignore — so
migration files never actually made it into version control), so schema
changes are applied by hand with plain guarded SQL instead. Safe to run
multiple times — every statement is IF NOT EXISTS / guarded.

Covers:
  - products.grade (cashew grade like W240, W320 — used by the /products
    filter sidebar)
  - about_page (singleton row, same pattern as site_settings)
  - about_images (gallery images grouped by farm/factory/product/sales)

Run with:  python -m app.scripts.migrate_about_and_grade
"""
import asyncio

from sqlalchemy import text

from app.core.database import engine


STATEMENTS = [
    # ── products.grade ──────────────────────────────────────────────────
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS grade VARCHAR(30)",
    "CREATE INDEX IF NOT EXISTS ix_products_grade ON products (grade)",

    # ── about_page (singleton, id=1) ────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS about_page (
        id INTEGER PRIMARY KEY DEFAULT 1,
        hero_title VARCHAR(255),
        hero_subtitle VARCHAR(500),
        content TEXT,
        meta_title VARCHAR(255),
        meta_description VARCHAR(500),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,

    # ── about_images (gallery, grouped by category) ─────────────────────
    # No DB-side default on id — SQLAlchemy supplies uuid.uuid4() from the
    # Python side on every insert (same as auth_slides), so this doesn't
    # need the pgcrypto extension for gen_random_uuid().
    """
    CREATE TABLE IF NOT EXISTS about_images (
        id UUID PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        file_id VARCHAR(255),
        category VARCHAR(30) NOT NULL DEFAULT 'farm',
        caption VARCHAR(255),
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
]


async def migrate():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt.strip()[:80]}...")
            await conn.execute(text(stmt))
    print("✅ products.grade added, about_page + about_images tables ready")


if __name__ == "__main__":
    asyncio.run(migrate())
