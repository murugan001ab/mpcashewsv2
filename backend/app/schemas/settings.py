from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SiteSettingsResponse(BaseModel):
    business_name: Optional[str] = None
    trademark_text: Optional[str] = None
    footer_about: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None

    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    support_hours: Optional[str] = None

    fssai_license_no: Optional[str] = None
    gstin: Optional[str] = None
    cin: Optional[str] = None

    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    linkedin_url: Optional[str] = None

    copyright_text: Optional[str] = None

    updated_at: datetime

    model_config = {"from_attributes": True}


class SiteSettingsUpdate(BaseModel):
    """All fields optional — admin PATCHes only what they're changing."""

    business_name: Optional[str] = None
    trademark_text: Optional[str] = None
    footer_about: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None

    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    support_hours: Optional[str] = None

    fssai_license_no: Optional[str] = None
    gstin: Optional[str] = None
    cin: Optional[str] = None

    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    youtube_url: Optional[str] = None
    linkedin_url: Optional[str] = None

    copyright_text: Optional[str] = None
