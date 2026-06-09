from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cart import Cart, CartItem
from app.repositories.base import BaseRepository


class CartRepository(BaseRepository[Cart]):
    def __init__(self, db: AsyncSession):
        super().__init__(Cart, db)

    async def get_by_user(self, user_id: UUID) -> Optional[Cart]:
        result = await self.db.execute(
            select(Cart)
            .options(
                selectinload(Cart.items).selectinload(CartItem.product).selectinload(
                    __import__("app.models.product", fromlist=["Product"]).Product.images
                ),
                selectinload(Cart.items).selectinload(CartItem.product).selectinload(
                    __import__("app.models.product", fromlist=["Product"]).Product.category
                ),
            )
            .where(Cart.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_cart_item(self, cart_id: UUID, product_id: UUID) -> Optional[CartItem]:
        result = await self.db.execute(
            select(CartItem).where(
                CartItem.cart_id == cart_id,
                CartItem.product_id == product_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_cart_item_by_id(self, item_id: UUID) -> Optional[CartItem]:
        result = await self.db.execute(select(CartItem).where(CartItem.id == item_id))
        return result.scalar_one_or_none()
