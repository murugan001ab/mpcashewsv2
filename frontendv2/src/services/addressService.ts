// src/services/addressService.ts
// Translates between UI field names (name, phone_number, pincode) and
// backend field names (full_name, phone, postal_code) to avoid 422s.
import { get, post, patch, del } from "./api";

export interface Address {
  id: string | number;
  name: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

interface ApiAddress {
  id: string | number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const fromApi = (a: ApiAddress): Address => ({
  id: a.id,
  name: a.full_name,
  phone_number: a.phone,
  address_line1: a.address_line1,
  address_line2: a.address_line2 ?? "",
  city: a.city,
  state: a.state,
  pincode: a.postal_code,
  country: a.country,
  is_default: a.is_default,
});

const toApi = (a: Partial<Address>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (a.name !== undefined) payload.full_name = a.name;
  if (a.phone_number !== undefined) payload.phone = a.phone_number;
  if (a.address_line1 !== undefined) payload.address_line1 = a.address_line1;
  if (a.address_line2 !== undefined) payload.address_line2 = a.address_line2;
  if (a.city !== undefined) payload.city = a.city;
  if (a.state !== undefined) payload.state = a.state;
  if (a.pincode !== undefined) payload.postal_code = a.pincode;
  if (a.country !== undefined) payload.country = a.country;
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
