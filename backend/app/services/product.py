from typing import Optional, List
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, Category, ProductImage, ProductVariant
from app.repositories.product import ProductRepository, CategoryRepository, ProductVariantRepository
from app.schemas.product import (
    ProductCreate, ProductUpdate,
    ProductVariantCreate, ProductVariantUpdate,
    CategoryCreate, CategoryUpdate,
)
from app.utils.slugify import slugify
from app.utils.file_upload import save_upload_file, delete_upload_file
from app.utils.pagination import paginate, get_skip_limit


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.repo = CategoryRepository(db)

    async def create(self, data: CategoryCreate) -> Category:
        slug = slugify(data.name)
        existing = await self.repo.get_by_slug(slug)
        if existing:
            raise HTTPException(status_code=409, detail="Category with this name already exists")
        category = Category(slug=slug, **data.model_dump())
        return await self.repo.create(category)

    async def get_all(self) -> List[Category]:
        return await self.repo.get_active()

    async def get_all_for_admin(self) -> List[Category]:
        return await self.repo.get_all()

    async def get_by_id(self, category_id: UUID) -> Category:
        cat = await self.repo.get_by_id(category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        return cat

    async def update(self, category_id: UUID, data: CategoryUpdate) -> Category:
        cat = await self.get_by_id(category_id)
        update_data = data.model_dump(exclude_none=True)
        if "name" in update_data:
            new_slug = slugify(update_data["name"])
            if new_slug != cat.slug:
                existing = await self.repo.get_by_slug(new_slug)
                if existing and existing.id != category_id:
                    raise HTTPException(
                        status_code=409,
                        detail="Another category with this name already exists",
                    )
                update_data["slug"] = new_slug
        return await self.repo.update(cat, update_data)

    async def delete(self, category_id: UUID) -> None:
        cat = await self.get_by_id(category_id)
        await self.repo.delete(cat)


class ProductService:
    def __init__(self, db: AsyncSession):
        self.repo = ProductRepository(db)
        self.variant_repo = ProductVariantRepository(db)

    async def _unique_slug(self, name: str) -> str:
        slug = slugify(name)
        base_slug = slug
        counter = 1
        while await self.repo.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    async def create(self, data: ProductCreate) -> Product:
        # Validate variant SKUs are unique globally
        for v in data.variants:
            if await self.variant_repo.get_by_sku(v.sku):
                raise HTTPException(status_code=409, detail=f"SKU '{v.sku}' already exists")

        slug = await self._unique_slug(data.name)
        product_data = data.model_dump(exclude={"variants"})
        product = Product(slug=slug, **product_data)
        self.repo.db.add(product)
        await self.repo.db.flush()  # get product.id

        for v in data.variants:
            variant = ProductVariant(product_id=product.id, **v.model_dump())
            self.repo.db.add(variant)

        await self.repo.db.flush()
        await self.repo.db.refresh(product)
        return await self.repo.get_with_relations(product.id)

    async def get_list(
        self,
        query: Optional[str] = None,
        category_id: Optional[UUID] = None,
        is_featured: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        products, total = await self.repo.search_products(
            query=query,
            category_id=category_id,
            is_featured=is_featured,
            skip=skip,
            limit=limit,
        )
        return {"items": products, **paginate(total, page, page_size)}

    async def get_by_id(self, product_id: UUID) -> Product:
        product = await self.repo.get_with_relations(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def get_by_slug(self, slug: str) -> Product:
        product = await self.repo.get_by_slug(slug)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def update(self, product_id: UUID, data: ProductUpdate) -> Product:
        product = await self.get_by_id(product_id)
        update_data = data.model_dump(exclude_none=True)
        if "name" in update_data:
            new_slug = slugify(update_data["name"])
            if new_slug != product.slug:
                new_slug = await self._unique_slug(update_data["name"])
                update_data["slug"] = new_slug
        return await self.repo.update(product, update_data)

    async def delete(self, product_id: UUID) -> None:
        product = await self.get_by_id(product_id)
        await self.repo.delete(product)

    # ------------------------------------------------------------------
    # Image helpers
    # ------------------------------------------------------------------

    async def upload_image(self, product_id: UUID, file: UploadFile, is_primary: bool = False) -> ProductImage:
        product = await self.get_by_id(product_id)
        url = await save_upload_file(file, "products")
        if is_primary:
            for img in product.images:
                img.is_primary = False
        image = ProductImage(
            product_id=product_id,
            url=url,
            is_primary=is_primary or len(product.images) == 0,
            sort_order=len(product.images),
        )
        self.repo.db.add(image)
        await self.repo.db.flush()
        await self.repo.db.refresh(image)
        return image

    async def delete_image(self, product_id: UUID, image_id: UUID) -> None:
        from sqlalchemy import select
        result = await self.repo.db.execute(
            select(ProductImage).where(
                ProductImage.id == image_id,
                ProductImage.product_id == product_id,
            )
        )
        image = result.scalar_one_or_none()
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        await delete_upload_file(image.url)
        await self.repo.db.delete(image)
        await self.repo.db.flush()


class ProductVariantService:
    def __init__(self, db: AsyncSession):
        self.repo = ProductVariantRepository(db)
        self.product_repo = ProductRepository(db)

    async def _get_product(self, product_id: UUID) -> Product:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def _get_variant(self, variant_id: UUID) -> ProductVariant:
        variant = await self.repo.get_by_id(variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        return variant

    async def create(self, product_id: UUID, data: ProductVariantCreate) -> ProductVariant:
        await self._get_product(product_id)
        if await self.repo.get_by_sku(data.sku):
            raise HTTPException(status_code=409, detail=f"SKU '{data.sku}' already exists")
        variant = ProductVariant(product_id=product_id, **data.model_dump())
        self.repo.db.add(variant)
        await self.repo.db.flush()
        await self.repo.db.refresh(variant)
        return variant

    async def get_by_product(self, product_id: UUID) -> List[ProductVariant]:
        await self._get_product(product_id)
        return await self.repo.get_by_product(product_id)

    async def update(self, variant_id: UUID, data: ProductVariantUpdate) -> ProductVariant:
        variant = await self._get_variant(variant_id)
        update_data = data.model_dump(exclude_none=True)
        if "sku" in update_data and update_data["sku"] != variant.sku:
            existing = await self.repo.get_by_sku(update_data["sku"])
            if existing and existing.id != variant_id:
                raise HTTPException(status_code=409, detail=f"SKU '{update_data['sku']}' already exists")
        return await self.repo.update(variant, update_data)

    async def delete(self, variant_id: UUID) -> None:
        variant = await self._get_variant(variant_id)
        await self.repo.delete(variant)
