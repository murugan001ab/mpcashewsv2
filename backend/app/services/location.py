import logging

import httpx
from fastapi import HTTPException, status

from app.schemas.location import PincodeLookupResponse, ReverseGeocodeResponse

logger = logging.getLogger(__name__)

# Free, key-less India Post pincode lookup.
POSTAL_PINCODE_API = "https://api.postalpincode.in/pincode/{code}"
# Free, key-less reverse geocoding. Nominatim's usage policy requires a
# descriptive User-Agent and caps at ~1 request/sec, both fine for an
# address-entry form (a handful of confirmations per checkout, not bulk use).
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_HEADERS = {"User-Agent": "MPCashews-AddressForm/1.0 (contact: support@mpcashews.in)"}


class LocationService:
    """Server-side wrapper around third-party lookups so the frontend never
    calls (or needs credentials for) external geocoding services directly,
    and so we can validate/normalize whatever pincode or lat/lng the
    frontend sends before it ever touches an address record."""

    async def lookup_pincode(self, code: str) -> PincodeLookupResponse:
        if not (code.isdigit() and len(code) == 6):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid 6-digit pincode")

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(POSTAL_PINCODE_API.format(code=code))
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError:
            logger.warning("Pincode lookup upstream failure for %s", code)
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't look up that pincode right now")

        entry = (data or [{}])[0]
        if entry.get("Status") != "Success" or not entry.get("PostOffice"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pincode not found")

        offices = entry["PostOffice"]
        primary = offices[0]
        return PincodeLookupResponse(
            pincode=code,
            state=primary.get("State"),
            district=primary.get("District"),
            city=primary.get("Block") or primary.get("District"),
            area=", ".join(sorted({o.get("Name", "") for o in offices if o.get("Name")})) or None,
        )

    async def reverse_geocode(self, lat: float, lng: float) -> ReverseGeocodeResponse:
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid coordinates")

        params = {"format": "jsonv2", "lat": lat, "lon": lng, "addressdetails": 1, "zoom": 18}
        try:
            async with httpx.AsyncClient(timeout=6.0, headers=NOMINATIM_HEADERS) as client:
                resp = await client.get(NOMINATIM_REVERSE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError:
            logger.warning("Reverse geocode upstream failure for %s,%s", lat, lng)
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't detect an address for that location")

        addr = data.get("address") or {}
        house = " ".join(filter(None, [addr.get("house_number"), addr.get("building")])) or None
        line1 = house or addr.get("road")
        line2 = addr.get("road") if house else addr.get("suburb") or addr.get("neighbourhood")

        return ReverseGeocodeResponse(
            address_line1=line1,
            address_line2=line2,
            city=addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb"),
            district=addr.get("state_district") or addr.get("county"),
            state=addr.get("state"),
            postal_code=addr.get("postcode"),
            country=addr.get("country") or "India",
            display_name=data.get("display_name"),
        )
