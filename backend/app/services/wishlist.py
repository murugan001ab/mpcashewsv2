from uuid import UUID
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wishlist import Wishlist, WishlistItem
from app.repositories.wishlist import WishlistRepository
from app.repositories.product import ProductRepository


class WishlistService:
    def __init__(self, db: AsyncSession):
        self.wishlist_repo = WishlistRepository(db)
        self.product_repo = ProductRepository(db)

    async def _get_or_create(self, user_id: UUID) -> Wishlist:
        """
        Atomically get or create a wishlist for the user using
        INSERT ... ON CONFLICT DO NOTHING — same fix CartService applies for
        the identical race. Wishlist.user_id is unique=True, so two
        concurrent "add to wishlist" requests (double-click, two tabs) that
        both hit this method for a user's first-ever wishlist item used to
        both try to INSERT a new Wishlist row and one would fail with
        UniqueViolationError.
        """
        now = datetime.now(timezone.utc)

        stmt = (
            pg_insert(Wishlist)
            .values(user_id=user_id, created_at=now)
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        await self.wishlist_repo.db.execute(stmt)
        await self.wishlist_repo.db.flush()

        return await self.wishlist_repo.get_by_user(user_id)

    async def add_product(self, user_id: UUID, product_id: UUID) -> Wishlist:
        product = await self.product_repo.get_by_id(product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail="Product not found")

        wishlist = await self._get_or_create(user_id)
        existing = await self.wishlist_repo.get_item(wishlist.id, product_id)
        if existing:
            raise HTTPException(status_code=409, detail="Product already in wishlist")

        item = WishlistItem(wishlist_id=wishlist.id, product_id=product_id)
        self.wishlist_repo.db.add(item)
        await self.wishlist_repo.db.flush()
        return await self.wishlist_repo.get_by_user(user_id)

    async def remove_product(self, user_id: UUID, product_id: UUID) -> Wishlist:
        wishlist = await self._get_or_create(user_id)
        item = await self.wishlist_repo.get_item(wishlist.id, product_id)
        if not item:
            raise HTTPException(status_code=404, detail="Product not in wishlist")
        await self.wishlist_repo.db.delete(item)
        await self.wishlist_repo.db.flush()
        return await self.wishlist_repo.get_by_user(user_id)

    async def get_wishlist(self, user_id: UUID) -> Wishlist:
        return await self._get_or_create(user_id)
