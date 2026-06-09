from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, Category, ProductImage
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        result = await self.db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    async def get_active(self) -> List[Category]:
        result = await self.db.execute(select(Category).where(Category.is_active == True))
        return list(result.scalars().all())


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: AsyncSession):
        super().__init__(Product, db)

    async def get_with_relations(self, product_id: UUID) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.category), selectinload(Product.images))
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.category), selectinload(Product.images))
            .where(Product.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Optional[Product]:
        result = await self.db.execute(select(Product).where(Product.sku == sku))
        return result.scalar_one_or_none()

    async def search_products(
        self,
        query: Optional[str] = None,
        category_id: Optional[UUID] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Product], int]:
        stmt = (
            select(Product)
            .options(selectinload(Product.category), selectinload(Product.images))
            .where(Product.is_active == True)
        )
        count_stmt = select(func.count()).select_from(Product).where(Product.is_active == True)

        if query:
            search = f"%{query}%"
            stmt = stmt.where(or_(Product.name.ilike(search), Product.description.ilike(search)))
            count_stmt = count_stmt.where(or_(Product.name.ilike(search), Product.description.ilike(search)))
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
            count_stmt = count_stmt.where(Product.category_id == category_id)
        if min_price is not None:
            stmt = stmt.where(Product.price >= min_price)
            count_stmt = count_stmt.where(Product.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(Product.price <= max_price)
            count_stmt = count_stmt.where(Product.price <= max_price)
        if in_stock:
            stmt = stmt.where(Product.stock > 0)
            count_stmt = count_stmt.where(Product.stock > 0)
        if is_featured is not None:
            stmt = stmt.where(Product.is_featured == is_featured)
            count_stmt = count_stmt.where(Product.is_featured == is_featured)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def update_stock(self, product_id: UUID, quantity_delta: int) -> Optional[Product]:
        product = await self.get_by_id(product_id)
        if product:
            product.stock += quantity_delta
            await self.db.flush()
        return product

    async def get_low_stock(self, threshold: int = 10) -> List[Product]:
        result = await self.db.execute(
            select(Product).where(Product.stock <= threshold, Product.is_active == True)
        )
        return list(result.scalars().all())
