from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blog import BlogPost
from app.repositories.blog import BlogRepository
from app.schemas.blog import BlogPostCreate, BlogPostUpdate
from app.utils.slugify import slugify
from app.utils.pagination import paginate, get_skip_limit


class BlogService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = BlogRepository(db)

    async def _unique_slug(self, title: str, exclude_id: Optional[UUID] = None) -> str:
        base_slug = slugify(title)
        slug = base_slug
        counter = 1
        while True:
            existing = await self.repo.get_by_slug(slug)
            if not existing or existing.id == exclude_id:
                return slug
            slug = f"{base_slug}-{counter}"
            counter += 1

    async def create(self, author_id: UUID, data: BlogPostCreate) -> BlogPost:
        slug = await self._unique_slug(data.title)
        post = BlogPost(
            slug=slug,
            author_id=author_id,
            published_at=datetime.now(timezone.utc) if data.is_published else None,
            **data.model_dump(),
        )
        post = await self.repo.create(post)
        return await self.repo.get_with_relations(post.id)

    async def admin_list(
        self, page: int = 1, page_size: int = 20, is_published: Optional[bool] = None
    ) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        posts, total = await self.repo.list_all_admin(skip, limit, is_published)
        return {"items": posts, **paginate(total, page, page_size)}

    async def admin_get(self, post_id: UUID) -> BlogPost:
        post = await self.repo.get_with_relations(post_id)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found")
        return post

    async def update(self, post_id: UUID, data: BlogPostUpdate) -> BlogPost:
        post = await self.admin_get(post_id)
        update_data = data.model_dump(exclude_none=True)

        if "title" in update_data and update_data["title"] != post.title:
            update_data["slug"] = await self._unique_slug(update_data["title"], exclude_id=post_id)

        # Stamp published_at the first time a post goes live; if it's later
        # unpublished and republished, keep the original publish date rather
        # than resetting it.
        if update_data.get("is_published") and not post.published_at:
            update_data["published_at"] = datetime.now(timezone.utc)

        await self.repo.update(post, update_data)
        return await self.repo.get_with_relations(post_id)

    async def delete(self, post_id: UUID) -> None:
        post = await self.admin_get(post_id)
        await self.repo.delete(post)

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    async def list_published(self, page: int = 1, page_size: int = 10) -> dict:
        skip, limit = get_skip_limit(page, page_size)
        posts, total = await self.repo.list_published(skip, limit)
        return {"items": posts, **paginate(total, page, page_size)}

    async def get_by_slug(self, slug: str) -> BlogPost:
        post = await self.repo.get_by_slug(slug, published_only=True)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found")
        await self.repo.increment_view(post)
        return post
