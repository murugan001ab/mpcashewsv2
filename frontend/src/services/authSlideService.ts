// src/services/authSlideService.ts
// Public GET (/auth-slides) is here; admin CRUD (/admin/auth-slides) lives
// here too rather than adminService.ts, since it's a big enough surface
// (upload, edit, reorder, delete) to warrant its own file — same split
// blogService.ts uses for public/admin endpoints.
import { get, patch, del, postForm } from "./api";
import type { AuthSlide, AuthSlideAdmin, AuthSlideUpdatePayload } from "@/types";

// ── Public ───────────────────────────────────────────────────────────────
export const getAuthSlides = (): Promise<AuthSlide[]> => get<AuthSlide[]>("/auth-slides");

// ── Admin ────────────────────────────────────────────────────────────────
export const getAdminAuthSlides = (): Promise<AuthSlideAdmin[]> => get<AuthSlideAdmin[]>("/admin/auth-slides");

// quote/cite are query params on the backend (the multipart body only
// carries the file), so they go in config.params rather than the FormData.
export const createAuthSlide = (file: File, quote: string, cite?: string): Promise<AuthSlideAdmin> => {
  const formData = new FormData();
  formData.append("file", file);
  return postForm<AuthSlideAdmin>("/admin/auth-slides", formData, {
    params: { quote, cite: cite || undefined },
  });
};

export const updateAuthSlide = (slideId: string, data: AuthSlideUpdatePayload): Promise<AuthSlideAdmin> =>
  patch<AuthSlideAdmin>(`/admin/auth-slides/${slideId}`, data);

export const deleteAuthSlide = (slideId: string): Promise<void> => del<void>(`/admin/auth-slides/${slideId}`);

// Full ordered list of slide IDs; sort_order is rewritten to match.
export const reorderAuthSlides = (slideIds: string[]): Promise<AuthSlideAdmin[]> =>
  patch<AuthSlideAdmin[]>("/admin/auth-slides/reorder", { slide_ids: slideIds });
