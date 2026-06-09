from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wishlist import Wishlist, WishlistItem
from app.repositories.base import BaseRepository


class WishlistRepository(BaseRepository[Wishlist]):
    def __init__(self, db: AsyncSession):
        super().__init__(Wishlist, db)

    async def get_by_user(self, user_id: UUID) -> Optional[Wishlist]:
        result = await self.db.execute(
            select(Wishlist)
            .options(
                selectinload(Wishlist.items).selectinload(WishlistItem.product).selectinload(
                    __import__("app.models.product", fromlist=["Product"]).Product.images
                ),
                selectinload(Wishlist.items).selectinload(WishlistItem.product).selectinload(
                    __import__("app.models.product", fromlist=["Product"]).Product.category
                ),
            )
            .where(Wishlist.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_item(self, wishlist_id: UUID, product_id: UUID) -> Optional[WishlistItem]:
        result = await self.db.execute(
            select(WishlistItem).where(
                WishlistItem.wishlist_id == wishlist_id,
                WishlistItem.product_id == product_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_item_by_id(self, item_id: UUID) -> Optional[WishlistItem]:
        result = await self.db.execute(
            select(WishlistItem).where(WishlistItem.id == item_id)
        )
        return result.scalar_one_or_none()
