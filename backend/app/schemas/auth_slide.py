import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class AuthSlideResponse(BaseModel):
    id: uuid.UUID
    url: str
    quote: str
    cite: Optional[str] = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class AuthSlideAdminResponse(AuthSlideResponse):
    """Same as the public shape plus created_at/updated_at, for the admin list."""
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuthSlideUpdate(BaseModel):
    quote: Optional[str] = None
    cite: Optional[str] = None
    is_active: Optional[bool] = None


class AuthSlideReorder(BaseModel):
    """Full ordered list of slide IDs. sort_order is rewritten to match."""
    slide_ids: List[uuid.UUID]
