import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AuthSlide(Base):
    """
    Admin-managed image + quote slides shown on the /login and /register
    pages' left-hand panel (frontend src/components/AuthLayout.tsx). These
    used to be hardcoded picsum.photos placeholders in that component;
    this table lets an admin upload real photos and edit the quote/cite
    text without a code change.

    Ordered by sort_order; only is_active=True rows are served on the
    public GET endpoint, so an admin can stage a slide before publishing.
    """

    __tablename__ = "auth_slides"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    cite: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<AuthSlide {self.id}>"
