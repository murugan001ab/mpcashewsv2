import re
import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, field_validator

# 6-digit Indian PIN code, first digit 1-9 (0 isn't used for any real zone).
PINCODE_RE = re.compile(r"^[1-9][0-9]{5}$")
# Indian mobile numbers: 10 digits starting 6-9, optionally with a +91/91 prefix.
MOBILE_RE = re.compile(r"^(?:\+?91)?[6-9]\d{9}$")

AddressType = Literal["home", "work", "other"]


class AddressBase(BaseModel):
    @field_validator("phone", check_fields=False)
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = v.replace(" ", "").replace("-", "")
        if not MOBILE_RE.match(cleaned):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return cleaned

    @field_validator("postal_code", check_fields=False)
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not PINCODE_RE.match(v.strip()):
            raise ValueError("Enter a valid 6-digit pincode")
        return v.strip()

    @field_validator("latitude", check_fields=False)
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude", check_fields=False)
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class AddressCreate(AddressBase):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    district: Optional[str] = None
    state: str
    postal_code: str
    country: str = "India"
    address_type: AddressType = "home"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False


class AddressUpdate(AddressBase):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    address_type: Optional[AddressType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str]
    landmark: Optional[str] = None
    city: str
    district: Optional[str] = None
    state: str
    postal_code: str
    country: str
    address_type: str = "home"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}
