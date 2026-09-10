from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.blog import BlogPostResponse, PaginatedBlogPosts
from app.services.blog import BlogService

router = APIRouter()


@router.get("", response_model=PaginatedBlogPosts)
async def list_blog_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Public: list published blog posts, most recent first."""
    service = BlogService(db)
    return await service.list_published(page, page_size)


@router.get("/{slug}", response_model=BlogPostResponse)
async def get_blog_post(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: get a single published post by slug."""
    service = BlogService(db)
    return await service.get_by_slug(slug)
