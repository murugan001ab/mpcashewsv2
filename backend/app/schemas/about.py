import uuid
from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, Field

AboutImageCategory = Literal["farm", "factory", "product", "sales"]


# ── About page content ──────────────────────────────────────────────────────
class AboutPageResponse(BaseModel):
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AboutPageUpdate(BaseModel):
    """All fields optional — admin PATCHes only what they're changing.
    max_length here mirrors the AboutPage column widths so an over-long
    value 422s cleanly instead of failing as a raw DB error on save."""

    hero_title: Optional[str] = Field(None, max_length=255)
    hero_subtitle: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = None
    meta_title: Optional[str] = Field(None, max_length=255)
    meta_description: Optional[str] = Field(None, max_length=500)


# ── About page gallery images ───────────────────────────────────────────────
class AboutImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    category: AboutImageCategory
    caption: Optional[str] = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class AboutImageAdminResponse(AboutImageResponse):
    """Same as the public shape plus created_at/updated_at, for the admin list."""
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AboutImageUpdate(BaseModel):
    category: Optional[AboutImageCategory] = None
    caption: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class AboutImageReorder(BaseModel):
    """Full ordered list of image IDs *within one category*. sort_order is
    rewritten to match; images in other categories are untouched."""
    category: AboutImageCategory
    image_ids: List[uuid.UUID]
