from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.location import PincodeLookupResponse, ReverseGeocodeResponse
from app.services.location import LocationService

router = APIRouter()


@router.get("/pincode/{code}", response_model=PincodeLookupResponse)
async def lookup_pincode(
    code: str,
    current_user: User = Depends(get_current_user),
):
    """Look up state/city/district for a 6-digit Indian pincode, for
    address-form auto-fill. Requires login since it's only ever called from
    the address form (profile/checkout), same trust level as other
    user-scoped endpoints."""
    return await LocationService().lookup_pincode(code)


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    current_user: User = Depends(get_current_user),
):
    """Turn map-picked coordinates into address fields the admin/customer
    can then edit before saving. Coordinates are never persisted unless the
    user explicitly saves the address afterwards."""
    return await LocationService().reverse_geocode(lat, lng)
