from typing import Optional, Tuple, List
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, Category, ProductImage
from app.repositories.product import ProductRepository, CategoryRepository
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate
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

    async def get_by_id(self, category_id: UUID) -> Category:
        cat = await self.repo.get_by_id(category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        return cat

    async def update(self, category_id: UUID, data: CategoryUpdate) -> Category:
        cat = await self.get_by_id(category_id)
        update_data = data.model_dump(exclude_none=True)
        if "name" in update_data:
            update_data["slug"] = slugify(update_data["name"])
        return await self.repo.update(cat, update_data)

    async def delete(self, category_id: UUID) -> None:
        cat = await self.get_by_id(category_id)
        await self.repo.delete(cat)


class ProductService:
    def __init__(self, db: AsyncSession):
        self.repo = ProductRepository(db)

    async def create(self, data: ProductCreate) -> Product:
        existing_sku = await self.repo.get_by_sku(data.sku)
        if existing_sku:
            raise HTTPException(status_code=409, detail="SKU already exists")
        slug = slugify(data.name)
        # Ensure slug uniqueness
        base_slug = slug
        counter = 1
        while await self.repo.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1
        product = Product(slug=slug, **data.model_dump())
        return await self.repo.create(product)

    async def get_list(
        self,
        query: Optional[str] = None,
        category_id: Optional[UUID] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        products, total = await self.repo.search_products(
            query=query,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
            in_stock=in_stock,
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
                base_slug = new_slug
                counter = 1
                while await self.repo.get_by_slug(new_slug):
                    new_slug = f"{base_slug}-{counter}"
                    counter += 1
                update_data["slug"] = new_slug
        return await self.repo.update(product, update_data)

    async def delete(self, product_id: UUID) -> None:
        product = await self.get_by_id(product_id)
        await self.repo.delete(product)

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
        from sqlalchemy.ext.asyncio import AsyncSession
        self.repo.db.add(image)
        await self.repo.db.flush()
        await self.repo.db.refresh(image)
        return image

    async def delete_image(self, product_id: UUID, image_id: UUID) -> None:
        from sqlalchemy import select
        from app.models.product import ProductImage
        result = await self.repo.db.execute(
            select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
        )
        image = result.scalar_one_or_none()
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        await delete_upload_file(image.url)
        await self.repo.db.delete(image)
        await self.repo.db.flush()
