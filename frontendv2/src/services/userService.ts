// src/services/userService.ts
import { get, patch, post } from "./api";
import type { User, UpdateProfilePayload, ChangePasswordPayload } from "@/types";

export const getProfile = (): Promise<User> => get<User>("/users/me");

export const updateProfile = (payload: UpdateProfilePayload): Promise<User> =>
  patch<User>("/users/me", payload);

export const changePassword = (
  payload: ChangePasswordPayload
): Promise<{ message: string }> => post("/users/me/change-password", payload);
