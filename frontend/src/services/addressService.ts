// src/services/addressService.ts
// Translates between UI field names (name, phone_number, pincode, houseFlat,
// streetArea) and backend field names (full_name, phone, postal_code,
// address_line1, address_line2) to avoid 422s.
import { get, post, patch, del } from "./api";

export type AddressType = "home" | "work" | "other";

export interface Address {
  id: string | number;
  name: string;
  phone_number: string;
  house_flat: string; // backend: address_line1
  street_area?: string; // backend: address_line2
  landmark?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country: string;
  address_type: AddressType;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
}

interface ApiAddress {
  id: string | number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  city: string;
  district?: string | null;
  state: string;
  postal_code: string;
  country: string;
  address_type?: AddressType;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
}

const fromApi = (a: ApiAddress): Address => ({
  id: a.id,
  name: a.full_name,
  phone_number: a.phone,
  house_flat: a.address_line1,
  street_area: a.address_line2 ?? "",
  landmark: a.landmark ?? "",
  city: a.city,
  district: a.district ?? "",
  state: a.state,
  pincode: a.postal_code,
  country: a.country,
  address_type: a.address_type ?? "home",
  latitude: a.latitude ?? null,
  longitude: a.longitude ?? null,
  is_default: a.is_default,
});

const toApi = (a: Partial<Address>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (a.name !== undefined) payload.full_name = a.name;
  if (a.phone_number !== undefined) payload.phone = a.phone_number;
  if (a.house_flat !== undefined) payload.address_line1 = a.house_flat;
  if (a.street_area !== undefined) payload.address_line2 = a.street_area;
  if (a.landmark !== undefined) payload.landmark = a.landmark;
  if (a.city !== undefined) payload.city = a.city;
  if (a.district !== undefined) payload.district = a.district;
  if (a.state !== undefined) payload.state = a.state;
  if (a.pincode !== undefined) payload.postal_code = a.pincode;
  if (a.country !== undefined) payload.country = a.country;
  if (a.address_type !== undefined) payload.address_type = a.address_type;
  if (a.latitude !== undefined) payload.latitude = a.latitude;
  if (a.longitude !== undefined) payload.longitude = a.longitude;
  if (a.is_default !== undefined) payload.is_default = a.is_default;
  return payload;
};

export const getAddresses = async (): Promise<Address[]> => {
  const list = await get<ApiAddress[]>("users/me/addresses");
  return (list || []).map(fromApi);
};

export const addAddress = async (data: Omit<Address, "id">): Promise<Address> => {
  const created = await post<ApiAddress>("users/me/addresses", toApi(data));
  return fromApi(created);
};

export const updateAddress = async (
  id: string | number,
  data: Partial<Address>
): Promise<Address> => {
  const updated = await patch<ApiAddress>(`users/me/addresses/${id}`, toApi(data));
  return fromApi(updated);
};

export const deleteAddressById = (id: string | number): Promise<unknown> =>
  del(`users/me/addresses/${id}`);
