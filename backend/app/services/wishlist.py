from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wishlist import Wishlist, WishlistItem
from app.repositories.wishlist import WishlistRepository
from app.repositories.product import ProductRepository


class WishlistService:
    def __init__(self, db: AsyncSession):
        self.wishlist_repo = WishlistRepository(db)
        self.product_repo = ProductRepository(db)

    async def _get_or_create(self, user_id: UUID) -> Wishlist:
        wishlist = await self.wishlist_repo.get_by_user(user_id)
        if not wishlist:
            wishlist = Wishlist(user_id=user_id)
            wishlist = await self.wishlist_repo.create(wishlist)
        return wishlist

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
