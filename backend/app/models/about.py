import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AboutPage(Base):
    """Singleton table (always exactly one row, id=1) holding the
    admin-editable "About Us" page content: hero copy, the main company
    story (rich HTML, same trust model as BlogPost.content), and its own
    SEO title/description. Mirrors the SiteSettings singleton pattern.
    Public GET /about serves this; admins edit it via PATCH /admin/about."""

    __tablename__ = "about_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    hero_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hero_subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Main body — admin-authored HTML, rendered as-is on the frontend
    # (same pattern as BlogPost.content).
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # SEO — mirrors BlogPost.meta_title / meta_description. Falls back to
    # hero_title / hero_subtitle on the frontend when left blank.
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return "<AboutPage singleton>"


class AboutImage(Base):
    """Admin-managed gallery images shown on the About page, grouped by
    category (farm / factory / product / sales) so the frontend can render
    them as separate labelled sections instead of one flat gallery. Ordered
    by sort_order within each category; only is_active=True rows are served
    on the public endpoint, mirroring AuthSlide's staging behaviour."""

    __tablename__ = "about_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # One of: farm, factory, product, sales (validated at the schema level,
    # kept as a plain string here to avoid a DB-level enum migration for
    # what's ultimately just a display grouping).
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="farm")
    caption: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<AboutImage {self.id} ({self.category})>"
