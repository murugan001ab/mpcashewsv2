// src/services/aboutService.ts
// Public GET (/about, /about/images) is here; admin CRUD (/admin/about/*)
// lives here too — same split authSlideService.ts and blogService.ts use.
import { get, patch, del, postForm } from "./api";
import type {
  AboutPage,
  AboutPageUpdatePayload,
  AboutImage,
  AboutImageAdmin,
  AboutImageCategory,
  AboutImageUpdatePayload,
} from "@/types";

// ── Public ───────────────────────────────────────────────────────────────
export const getAboutPage = (): Promise<AboutPage> => get<AboutPage>("/about");

export const listAboutImages = (category?: AboutImageCategory): Promise<AboutImage[]> =>
  get<AboutImage[]>("/about/images", { params: category ? { category } : undefined });

// ── Admin ────────────────────────────────────────────────────────────────
export const getAdminAboutPage = (): Promise<AboutPage> => get<AboutPage>("/admin/about");

export const updateAboutPage = (data: AboutPageUpdatePayload): Promise<AboutPage> =>
  patch<AboutPage>("/admin/about", data);

export const getAdminAboutImages = (): Promise<AboutImageAdmin[]> =>
  get<AboutImageAdmin[]>("/admin/about/images");

// category/caption are query params on the backend (the multipart body
// only carries the file), so they go in config.params rather than the
// FormData — same pattern as authSlideService.createAuthSlide.
export const createAboutImage = (
  file: File,
  category: AboutImageCategory,
  caption?: string
): Promise<AboutImageAdmin> => {
  const formData = new FormData();
  formData.append("file", file);
  return postForm<AboutImageAdmin>("/admin/about/images", formData, {
    params: { category, caption: caption || undefined },
  });
};

export const updateAboutImage = (imageId: string, data: AboutImageUpdatePayload): Promise<AboutImageAdmin> =>
  patch<AboutImageAdmin>(`/admin/about/images/${imageId}`, data);

export const deleteAboutImage = (imageId: string): Promise<void> => del<void>(`/admin/about/images/${imageId}`);

// Full ordered list of image IDs *within one category*; sort_order is
// rewritten to match. Images in other categories are untouched.
export const reorderAboutImages = (
  category: AboutImageCategory,
  imageIds: string[]
): Promise<AboutImageAdmin[]> =>
  patch<AboutImageAdmin[]>("/admin/about/images/reorder", { category, image_ids: imageIds });
