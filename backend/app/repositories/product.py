from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, or_, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, Category, ProductImage, ProductVariant
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        result = await self.db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    async def get_active(self) -> List[Category]:
        result = await self.db.execute(
            select(Category).where(Category.is_active == True).order_by(Category.name)
        )
        return list(result.scalars().all())

    async def get_all(self) -> List[Category]:
        result = await self.db.execute(select(Category).order_by(Category.name))
        return list(result.scalars().all())


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: AsyncSession):
        super().__init__(Product, db)

    def _with_relations(self):
        return (
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.variants),
        )

    async def get_with_relations(self, product_id: UUID) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .options(*self._with_relations())
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .options(*self._with_relations())
            .where(Product.slug == slug)
        )
        return result.scalar_one_or_none()

    async def search_products(
        self,
        query: Optional[str] = None,
        category_id: Optional[UUID] = None,
        is_featured: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
        include_inactive: bool = False,
    ) -> Tuple[List[Product], int]:
        stmt = select(Product).options(*self._with_relations())
        count_stmt = select(func.count()).select_from(Product)

        if not include_inactive:
            stmt = stmt.where(Product.is_active == True)
            count_stmt = count_stmt.where(Product.is_active == True)

        if query:
            search = f"%{query}%"
            stmt = stmt.where(or_(Product.name.ilike(search), Product.description.ilike(search)))
            count_stmt = count_stmt.where(or_(Product.name.ilike(search), Product.description.ilike(search)))
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
            count_stmt = count_stmt.where(Product.category_id == category_id)
        if is_featured is not None:
            stmt = stmt.where(Product.is_featured == is_featured)
            count_stmt = count_stmt.where(Product.is_featured == is_featured)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total


class ProductVariantRepository(BaseRepository[ProductVariant]):
    def __init__(self, db: AsyncSession):
        super().__init__(ProductVariant, db)

    async def get_with_product(self, variant_id: UUID) -> Optional[ProductVariant]:
        result = await self.db.execute(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .where(ProductVariant.id == variant_id)
        )
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Optional[ProductVariant]:
        result = await self.db.execute(
            select(ProductVariant).where(ProductVariant.sku == sku)
        )
        return result.scalar_one_or_none()

    async def get_by_product(self, product_id: UUID) -> List[ProductVariant]:
        result = await self.db.execute(
            select(ProductVariant)
            .where(ProductVariant.product_id == product_id)
            .order_by(ProductVariant.weight_grams)
        )
        return list(result.scalars().all())

    async def get_by_id_and_product(
        self, variant_id: UUID, product_id: UUID
    ) -> Optional[ProductVariant]:
        result = await self.db.execute(
            select(ProductVariant).where(
                ProductVariant.id == variant_id,
                ProductVariant.product_id == product_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_stock(self, variant_id: UUID, quantity_delta: int) -> Optional[ProductVariant]:
        """
        Atomically adjust stock at the database level.

        Previously this did a plain read-modify-write (`variant.stock +=
        delta` then flush), which is a classic check-then-act race: under
        concurrent checkouts for the same low-stock variant, two requests
        could both read the same stock value, both pass validation, and both
        decrement — driving stock negative (overselling).

        The UPDATE below folds the read, the guard, and the write into one
        atomic statement: `WHERE stock + delta >= 0` means a decrement that
        would take stock below zero simply matches zero rows instead of
        racing another request. Positive deltas (restocks/refunds) always
        satisfy the guard.
        """
        from fastapi import HTTPException

        stmt = (
            update(ProductVariant)
            .where(
                ProductVariant.id == variant_id,
                (ProductVariant.stock + quantity_delta) >= 0,
            )
            .values(stock=ProductVariant.stock + quantity_delta)
            .returning(ProductVariant.id)
        )
        result = await self.db.execute(stmt)
        updated_id = result.scalar_one_or_none()

        if updated_id is None:
            # Either the variant doesn't exist, or (for a decrement) stock
            # ran out between the caller's earlier check and this write —
            # surface that clearly instead of silently no-op'ing.
            if quantity_delta < 0:
                raise HTTPException(status_code=400, detail="Insufficient stock — please try again")
            return None

        await self.db.flush()
        return await self.get_by_id(variant_id)
