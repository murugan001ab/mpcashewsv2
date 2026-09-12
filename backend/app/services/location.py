import asyncio
import logging
import time
from typing import Optional

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

# Nominatim's usage policy caps the *whole app* at ~1 request/sec, no matter
# how many customers are checking out at once. This is a global outbound
# gate (separate from slowapi's per-client rate limiting in middleware/) so
# two people confirming a pin at the same moment don't fire concurrent
# requests and risk our server's IP getting throttled or banned.
_NOMINATIM_MIN_INTERVAL = 1.1  # seconds; a little slack above the 1 req/s floor
_nominatim_lock = asyncio.Lock()
_nominatim_last_call = 0.0

# Small in-process cache so re-confirming the same pincode or map pin
# doesn't re-hit the upstream API every time. Checkout flows re-submit the
# same address a lot, and the GPS-refinement in LocationMapPicker can also
# settle on the same rounded spot across a couple of watchPosition ticks.
_CACHE_TTL_SECONDS = 30 * 60
_CACHE_MAX_ENTRIES = 512
_pincode_cache: dict[str, tuple[float, PincodeLookupResponse]] = {}
_geocode_cache: dict[tuple[float, float], tuple[float, ReverseGeocodeResponse]] = {}


def _cache_get(cache: dict, key):
    entry = cache.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at < time.monotonic():
        cache.pop(key, None)
        return None
    return value


def _cache_set(cache: dict, key, value):
    if len(cache) >= _CACHE_MAX_ENTRIES:
        # Evict the single oldest entry rather than pull in a dependency
        # for a proper LRU -- good enough for a cache this small.
        oldest_key = min(cache, key=lambda k: cache[k][0])
        cache.pop(oldest_key, None)
    cache[key] = (time.monotonic() + _CACHE_TTL_SECONDS, value)


class LocationService:
    """Server-side wrapper around third-party lookups so the frontend never
    calls (or needs credentials for) external geocoding services directly,
    and so we can validate/normalize whatever pincode or lat/lng the
    frontend sends before it ever touches an address record."""

    async def lookup_pincode(self, code: str) -> PincodeLookupResponse:
        if not (code.isdigit() and len(code) == 6):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid 6-digit pincode")

        cached = _cache_get(_pincode_cache, code)
        if cached:
            return cached

        data = await self._get_json(
            POSTAL_PINCODE_API.format(code=code),
            context=f"pincode {code}",
            error_detail="Couldn't look up that pincode right now",
        )

        entry = (data or [{}])[0]
        if entry.get("Status") != "Success" or not entry.get("PostOffice"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pincode not found")

        offices = entry["PostOffice"]
        primary = offices[0]
        result = PincodeLookupResponse(
            pincode=code,
            state=primary.get("State"),
            district=primary.get("District"),
            city=primary.get("Block") or primary.get("District"),
            area=", ".join(sorted({o.get("Name", "") for o in offices if o.get("Name")})) or None,
        )
        _cache_set(_pincode_cache, code, result)
        return result

    async def reverse_geocode(self, lat: float, lng: float) -> ReverseGeocodeResponse:
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid coordinates")

        # Round to ~11m so GPS jitter or a re-confirm of the same spot hits
        # the cache instead of Nominatim again.
        cache_key = (round(lat, 4), round(lng, 4))
        cached = _cache_get(_geocode_cache, cache_key)
        if cached:
            return cached

        params = {
            "format": "jsonv2",
            "lat": lat,
            "lon": lng,
            "addressdetails": 1,
            "zoom": 18,
            # Pin the language so field values (road/suburb/city names) are
            # consistent regardless of Nominatim's locale guessing.
            "accept-language": "en",
        }
        data = await self._get_json(
            NOMINATIM_REVERSE_URL,
            params=params,
            headers=NOMINATIM_HEADERS,
            context=f"reverse geocode {lat},{lng}",
            error_detail="Couldn't detect an address for that location",
            throttle=True,
        )

        addr = data.get("address") or {}
        house = " ".join(filter(None, [addr.get("house_number"), addr.get("building")])) or None
        line1 = house or addr.get("road")
        line2 = addr.get("road") if house else addr.get("suburb") or addr.get("neighbourhood")

        result = ReverseGeocodeResponse(
            address_line1=line1,
            address_line2=line2,
            city=addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb"),
            district=addr.get("state_district") or addr.get("county"),
            state=addr.get("state"),
            postal_code=addr.get("postcode"),
            country=addr.get("country") or "India",
            display_name=data.get("display_name"),
        )
        _cache_set(_geocode_cache, cache_key, result)
        return result

    async def _get_json(
        self,
        url: str,
        *,
        context: str,
        error_detail: str,
        params: Optional[dict] = None,
        headers: Optional[dict] = None,
        throttle: bool = False,
        attempts: int = 2,
    ) -> dict:
        """GET with a couple of transient-failure retries, and (for
        Nominatim) the global 1 req/sec throttle above. Upstream lookups are
        flaky enough on a free, shared service that a single failed attempt
        shouldn't immediately surface as a checkout-blocking error."""
        last_exc: Optional[Exception] = None
        for attempt in range(1, attempts + 1):
            if throttle:
                await self._throttle_nominatim()
            try:
                async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
                    resp = await client.get(url, params=params)
                if resp.status_code == 429:
                    # Upstream is telling us to back off -- honor it instead
                    # of hammering again immediately.
                    logger.warning("Upstream rate-limited us for %s (attempt %s)", context, attempt)
                    await asyncio.sleep(1.5)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as exc:
                last_exc = exc
                logger.warning("Upstream failure for %s (attempt %s): %s", context, attempt, exc)
                if attempt < attempts:
                    await asyncio.sleep(0.5)

        logger.warning("Upstream lookup failed for %s after %s attempts", context, attempts)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_detail) from last_exc

    async def _throttle_nominatim(self) -> None:
        global _nominatim_last_call
        async with _nominatim_lock:
            now = time.monotonic()
            wait = _NOMINATIM_MIN_INTERVAL - (now - _nominatim_last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            _nominatim_last_call = time.monotonic()
