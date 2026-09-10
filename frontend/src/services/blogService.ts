// src/services/blogService.ts
// Public blog endpoints (/blog/*) and admin blog CRUD (/admin/blog/*).
// Kept in one file since both sides operate on the same BlogPost resource —
// unlike templateService/adminService which are genuinely admin-only.
import { get, post, patch, del } from "./api";
import type {
  BlogPost,
  BlogPostPayload,
  BlogPostUpdatePayload,
  PaginatedBlogPosts,
  PaginatedBlogPostsAdmin,
} from "@/types";

// ── Public ───────────────────────────────────────────────────────────────
export const listBlogPosts = (page = 1, pageSize = 10): Promise<PaginatedBlogPosts> =>
  get<PaginatedBlogPosts>("/blog", { params: { page, page_size: pageSize } });

export const getBlogPostBySlug = (slug: string): Promise<BlogPost> =>
  get<BlogPost>(`/blog/${slug}`);

// ── Admin ────────────────────────────────────────────────────────────────
export const listAdminBlogPosts = (params?: {
  page?: number;
  page_size?: number;
  is_published?: boolean;
}): Promise<PaginatedBlogPostsAdmin> => get<PaginatedBlogPostsAdmin>("/admin/blog", { params });

export const getAdminBlogPost = (id: string): Promise<BlogPost> => get<BlogPost>(`/admin/blog/${id}`);

export const createBlogPost = (data: BlogPostPayload): Promise<BlogPost> =>
  post<BlogPost>("/admin/blog", data);

export const updateBlogPost = (id: string, data: BlogPostUpdatePayload): Promise<BlogPost> =>
  patch<BlogPost>(`/admin/blog/${id}`, data);

export const deleteBlogPost = (id: string): Promise<void> => del<void>(`/admin/blog/${id}`);
