from typing import Optional
from pydantic import BaseModel


class PincodeLookupResponse(BaseModel):
    pincode: str
    state: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    area: Optional[str] = None


class ReverseGeocodeResponse(BaseModel):
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    display_name: Optional[str] = None
