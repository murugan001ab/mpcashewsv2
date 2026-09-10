import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class BlogPostCreate(BaseModel):
    title: str
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    is_published: bool = False
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    is_published: Optional[bool] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class BlogAuthorInfo(BaseModel):
    id: uuid.UUID
    full_name: str

    model_config = {"from_attributes": True}


class BlogPostResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    author: Optional[BlogAuthorInfo] = None
    is_published: bool
    published_at: Optional[datetime] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    view_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlogPostListItem(BaseModel):
    """Lighter shape for list views — omits the full HTML body."""

    id: uuid.UUID
    title: str
    slug: str
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    author: Optional[BlogAuthorInfo] = None
    is_published: bool
    published_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedBlogPosts(BaseModel):
    items: List[BlogPostListItem]
    total: int
    page: int
    page_size: int
    pages: int


class PaginatedBlogPostsAdmin(BaseModel):
    items: List[BlogPostResponse]
    total: int
    page: int
    page_size: int
    pages: int
