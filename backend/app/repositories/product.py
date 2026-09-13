from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, or_, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, Category, ProductImage, ProductVariant
from app.models.review import Review
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        result = await self.db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    async def get_active(self) -> List[Category]:
        result = await self.db.execute(
            select(Category).where(Category.is_active == True).order_by(Category.sort_order, Category.name)
        )
        return list(result.scalars().all())

    async def get_all(self) -> List[Category]:
        result = await self.db.execute(select(Category).order_by(Category.sort_order, Category.name))
        return list(result.scalars().all())

    async def get_max_sort_order(self) -> int:
        result = await self.db.execute(select(func.max(Category.sort_order)))
        return result.scalar() or 0


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
        product = result.scalar_one_or_none()
        if product:
            await self._attach_ratings([product])
        return product

    async def get_by_slug(self, slug: str) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .options(*self._with_relations())
            .where(Product.slug == slug)
        )
        product = result.scalar_one_or_none()
        if product:
            await self._attach_ratings([product])
        return product

    async def search_products(
        self,
        query: Optional[str] = None,
        category_id: Optional[UUID] = None,
        is_featured: Optional[bool] = None,
        grades: Optional[List[str]] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        sort: Optional[str] = None,
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
        if grades:
            stmt = stmt.where(Product.grade.in_(grades))
            count_stmt = count_stmt.where(Product.grade.in_(grades))

        # Price range: a product matches if ANY active variant's effective
        # price (discounted price if set, else list price) falls in range.
        # Built as EXISTS rather than a join so a product with 3 variants
        # doesn't get triple-counted in the results/total.
        if min_price is not None or max_price is not None:
            effective_price = func.coalesce(ProductVariant.discounted_price, ProductVariant.price)
            conditions = [ProductVariant.product_id == Product.id, ProductVariant.is_active == True]
            if min_price is not None:
                conditions.append(effective_price >= min_price)
            if max_price is not None:
                conditions.append(effective_price <= max_price)
            price_match = select(ProductVariant.id).where(*conditions).exists()
            stmt = stmt.where(price_match)
            count_stmt = count_stmt.where(price_match)

        # Rating: matches if the product's average rating across approved
        # reviews is >= min_rating. Products with zero reviews never match
        # a rating filter (there's nothing to average), which is the
        # expected "4 stars & up" style behaviour.
        if min_rating is not None:
            rating_match = Product.id.in_(
                select(Review.product_id)
                .where(Review.is_approved == True)
                .group_by(Review.product_id)
                .having(func.avg(Review.rating) >= min_rating)
            )
            stmt = stmt.where(rating_match)
            count_stmt = count_stmt.where(rating_match)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        if sort == "price_asc" or sort == "price_desc":
            min_price_subq = (
                select(func.min(func.coalesce(ProductVariant.discounted_price, ProductVariant.price)))
                .where(ProductVariant.product_id == Product.id, ProductVariant.is_active == True)
                .correlate(Product)
                .scalar_subquery()
            )
            stmt = stmt.order_by(min_price_subq.asc() if sort == "price_asc" else min_price_subq.desc())
        elif sort == "rating_desc":
            avg_rating_subq = (
                select(func.avg(Review.rating))
                .where(Review.product_id == Product.id, Review.is_approved == True)
                .correlate(Product)
                .scalar_subquery()
            )
            stmt = stmt.order_by(avg_rating_subq.desc().nulls_last())
        else:
            stmt = stmt.order_by(Product.sort_order, Product.created_at.desc())

        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        products = list(result.scalars().all())
        await self._attach_ratings(products)
        return products, total

    async def _attach_ratings(self, products: List[Product]) -> None:
        """Sets transient .average_rating / .review_count attributes on each
        product (not real mapped columns — plain instance attributes that
        ProductResponse/ProductListResponse read via from_attributes). Done
        as one batched query rather than per-product to avoid N+1s."""
        if not products:
            return
        ids = [p.id for p in products]
        result = await self.db.execute(
            select(
                Review.product_id,
                func.avg(Review.rating).label("avg_rating"),
                func.count(Review.id).label("review_count"),
            )
            .where(Review.product_id.in_(ids), Review.is_approved == True)
            .group_by(Review.product_id)
        )
        ratings = {row.product_id: (float(row.avg_rating), row.review_count) for row in result.all()}
        for p in products:
            avg, count = ratings.get(p.id, (None, 0))
            p.average_rating = round(avg, 1) if avg is not None else None
            p.review_count = count

    async def get_filter_options(self) -> Tuple[List[str], Optional[float], Optional[float]]:
        """Distinct grades and min/max effective price across active
        products' active variants, for sizing the /products filter
        sidebar's grade checkboxes and price range inputs."""
        grades_result = await self.db.execute(
            select(Product.grade)
            .where(Product.is_active == True, Product.grade.is_not(None))
            .distinct()
            .order_by(Product.grade)
        )
        grades = [g for g in grades_result.scalars().all() if g]

        effective_price = func.coalesce(ProductVariant.discounted_price, ProductVariant.price)
        price_result = await self.db.execute(
            select(func.min(effective_price), func.max(effective_price))
            .select_from(ProductVariant)
            .join(Product, Product.id == ProductVariant.product_id)
            .where(Product.is_active == True, ProductVariant.is_active == True)
        )
        min_price, max_price = price_result.one()
        return grades, (float(min_price) if min_price is not None else None), (float(max_price) if max_price is not None else None)

    async def get_max_sort_order(self) -> int:
        result = await self.db.execute(select(func.max(Product.sort_order)))
        return result.scalar() or 0

    async def get_all(self) -> List[Product]:
        result = await self.db.execute(
            select(Product).options(*self._with_relations()).order_by(Product.sort_order)
        )
        return list(result.scalars().all())


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
