import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, field_validator


class ReviewCreate(BaseModel):
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    title: Optional[str] = None
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewAdminReply(BaseModel):
    admin_reply: str


class ReviewerInfo(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    user: ReviewerInfo
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    is_verified_purchase: bool
    is_approved: bool
    admin_reply: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedReviews(BaseModel):
    items: List[ReviewResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ProductRatingSummary(BaseModel):
    product_id: uuid.UUID
    average_rating: float
    total_reviews: int
    rating_breakdown: dict  # {"5": 10, "4": 3, "3": 1, "2": 0, "1": 0}
