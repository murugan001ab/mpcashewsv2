from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blog import BlogPost
from app.repositories.base import BaseRepository


class BlogRepository(BaseRepository[BlogPost]):
    def __init__(self, db: AsyncSession):
        super().__init__(BlogPost, db)

    # BlogPost.author uses lazy="selectin" on the model itself, so no
    # explicit eager-load options are needed here (unlike Order.items ->
    # product, which isn't selectin and must be loaded explicitly).

    async def get_with_relations(self, post_id: UUID) -> Optional[BlogPost]:
        result = await self.db.execute(select(BlogPost).where(BlogPost.id == post_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str, published_only: bool = False) -> Optional[BlogPost]:
        stmt = select(BlogPost).where(BlogPost.slug == slug)
        if published_only:
            stmt = stmt.where(BlogPost.is_published == True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_published(self, skip: int = 0, limit: int = 10) -> Tuple[List[BlogPost], int]:
        stmt = select(BlogPost).where(BlogPost.is_published == True)
        count_stmt = select(func.count()).select_from(BlogPost).where(BlogPost.is_published == True)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(BlogPost.published_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def list_all_admin(
        self, skip: int = 0, limit: int = 20, is_published: Optional[bool] = None
    ) -> Tuple[List[BlogPost], int]:
        stmt = select(BlogPost)
        count_stmt = select(func.count()).select_from(BlogPost)
        if is_published is not None:
            stmt = stmt.where(BlogPost.is_published == is_published)
            count_stmt = count_stmt.where(BlogPost.is_published == is_published)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(BlogPost.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def increment_view(self, post: BlogPost) -> None:
        post.view_count += 1
        await self.db.flush()
