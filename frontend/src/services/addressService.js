// src/services/addressService.js
//
// Backend (app/schemas/address.py) uses: full_name, phone, postal_code.
// The UI uses: name, phone_number, pincode.
// This service is the single place that translates between the two so
// every screen can keep using the friendlier UI field names without
// triggering 422s from the API.
//
// NOTE: Vite resolves "./addressService" to THIS .js file before the .ts
// twin, so this file (not addressService.ts) is what actually runs. Keep
// both in sync.
import { getData, postData, deleteData, patchData } from "./api";

const fromApi = (a) => ({
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

const toApi = (a) => {
  const payload = {};
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
export const getAddresses = async (_token) => {
  const list = await getData("users/me/addresses");
  return (list || []).map(fromApi);
};

// POST /api/v1/users/me/addresses
export const addAddress = async (_token, data) => {
  const created = await postData("users/me/addresses", toApi(data));
  return fromApi(created);
};

// PATCH /api/v1/users/me/addresses/{id}
export const updateAddress = async (_token, id, data) => {
  const updated = await patchData(`users/me/addresses/${id}`, toApi(data));
  return fromApi(updated);
};

// DELETE /api/v1/users/me/addresses/{id}
export const deleteAddressById = (_token, id) => deleteData(`users/me/addresses/${id}`);
