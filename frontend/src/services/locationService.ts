// src/services/locationService.ts
// Wraps the backend's /location/* endpoints (pincode auto-fill + reverse
// geocoding). These proxy to third-party lookups server-side so the
// frontend never needs an API key and coordinates/pincodes are validated
// before any address is saved.
import { get } from "./api";

export interface PincodeLookupResult {
  pincode: string;
  state?: string;
  city?: string;
  district?: string;
  area?: string;
}

export interface ReverseGeocodeResult {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  district?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  display_name?: string;
}

export const lookupPincode = (pincode: string): Promise<PincodeLookupResult> =>
  get<PincodeLookupResult>(`location/pincode/${pincode}`);

export const reverseGeocode = (lat: number, lng: number): Promise<ReverseGeocodeResult> =>
  get<ReverseGeocodeResult>("location/reverse-geocode", { params: { lat, lng } });
