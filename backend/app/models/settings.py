import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SiteSettings(Base):
    """Singleton table (always exactly one row, id=1) holding admin-editable
    site-wide content: business/contact details, legal/compliance numbers,
    and footer text. Frontend footer + legal pages read this via the public
    GET endpoint; admins edit it via the admin PATCH endpoint."""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    # Business identity
    business_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trademark_text: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e.g. "MPCashews® is a registered trademark of ..."
    footer_about: Mapped[str | None] = mapped_column(Text, nullable=True)  # short blurb shown in footer

    # Address
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True, default="India")

    # Contact
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    support_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e.g. "Mon-Sat, 9am-6pm"

    # Legal / compliance
    fssai_license_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cin: Mapped[str | None] = mapped_column(String(50), nullable=True)  # company identification number, optional

    # Social links
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    twitter_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Footer copyright line — admin can put whatever text/year format they want
    copyright_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return "<SiteSettings singleton>"
