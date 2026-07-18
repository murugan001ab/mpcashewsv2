// src/services/addressService.ts
//
// Backend (app/schemas/address.py) uses: full_name, phone, postal_code.
// The UI uses: name, phone_number, pincode.
// This service is the single place that translates between the two so
// every screen can keep using the friendlier UI field names without
// triggering 422s from the API.
import { getData, postData, deleteData, patchData } from "./api";

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
  created_at?: string;
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

const toApi = (a: Partial<Address>) => {
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

// GET /api/v1/users/me/addresses
export const getAddresses = async (_token?: string): Promise<Address[]> => {
  const list = await getData<ApiAddress[]>("users/me/addresses");
  return (list || []).map(fromApi);
};

// POST /api/v1/users/me/addresses
export const addAddress = async (
  _token: string | undefined,
  data: Omit<Address, "id">
): Promise<Address> => {
  const created = await postData<ApiAddress>("users/me/addresses", toApi(data));
  return fromApi(created);
};

// PATCH /api/v1/users/me/addresses/{id}
export const updateAddress = async (
  _token: string | undefined,
  id: string | number,
  data: Partial<Address>
): Promise<Address> => {
  const updated = await patchData<ApiAddress>(`users/me/addresses/${id}`, toApi(data));
  return fromApi(updated);
};

// DELETE /api/v1/users/me/addresses/{id}
export const deleteAddressById = (
  _token: string | undefined,
  id: string | number
): Promise<unknown> => deleteData(`users/me/addresses/${id}`);
