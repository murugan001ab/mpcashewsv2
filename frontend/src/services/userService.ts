// src/services/userService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/users/me endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { get, patch, post, del } from "./api";
import type {
  User,
  UpdateProfilePayload,
  ChangePasswordPayload,
  Address,
  AddressPayload,
} from "../types";

// ── Profile ───────────────────────────────────────────────────────────────────
// GET /api/v1/users/me
export const getProfile = (): Promise<User> =>
  get<User>("/users/me");

// PATCH /api/v1/users/me
export const updateProfile = (payload: UpdateProfilePayload): Promise<User> =>
  patch<User>("/users/me", payload);

// POST /api/v1/users/me/change-password
export const changePassword = (
  payload: ChangePasswordPayload
): Promise<{ message: string }> =>
  post("/users/me/change-password", payload);

// ── Addresses ─────────────────────────────────────────────────────────────────
// GET /api/v1/users/me/addresses
export const listAddresses = (): Promise<Address[]> =>
  get<Address[]>("/users/me/addresses");

// POST /api/v1/users/me/addresses
export const addAddress = (payload: AddressPayload): Promise<Address> =>
  post<Address>("/users/me/addresses", payload);

// PATCH /api/v1/users/me/addresses/{address_id}
export const updateAddress = (
  addressId: number,
  payload: Partial<AddressPayload>
): Promise<Address> =>
  patch<Address>(`/users/me/addresses/${addressId}`, payload);

// DELETE /api/v1/users/me/addresses/{address_id}
export const deleteAddress = (addressId: number): Promise<void> =>
  del<void>(`/users/me/addresses/${addressId}`);
