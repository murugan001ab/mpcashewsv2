// src/services/productService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/products/* and /api/v1/categories/* endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { get, post, patch, del, postForm } from "./api";
import type {
  Product,
  ProductPayload,
  ProductListParams,
  Category,
  CategoryPayload,
  PaginatedResponse,
} from "../types";

// ── Products ──────────────────────────────────────────────────────────────────
// GET /api/v1/products
export const listProducts = (
  params?: ProductListParams
): Promise<PaginatedResponse<Product>> =>
  get<PaginatedResponse<Product>>("/products", { params });

// POST /api/v1/products
export const createProduct = (payload: ProductPayload): Promise<Product> =>
  post<Product>("/products", payload);

// GET /api/v1/products/{product_id}
export const getProduct = (productId: number | string): Promise<Product> =>
  get<Product>(`/products/${productId}`);

// PATCH /api/v1/products/{product_id}
export const updateProduct = (
  productId: number,
  payload: Partial<ProductPayload>
): Promise<Product> => patch<Product>(`/products/${productId}`, payload);

// DELETE /api/v1/products/{product_id}
export const deleteProduct = (productId: number): Promise<void> =>
  del<void>(`/products/${productId}`);

// GET /api/v1/products/slug/{slug}
export const getProductBySlug = (slug: string): Promise<Product> =>
  get<Product>(`/products/slug/${slug}`);

// POST /api/v1/products/{product_id}/images  (multipart)
export const uploadProductImage = (
  productId: number,
  formData: FormData
): Promise<Product> => postForm<Product>(`/products/${productId}/images`, formData);

// DELETE /api/v1/products/{product_id}/images/{image_id}
export const deleteProductImage = (
  productId: number,
  imageId: number
): Promise<void> => del<void>(`/products/${productId}/images/${imageId}`);

// ── Categories ────────────────────────────────────────────────────────────────
// GET /api/v1/categories
export const listCategories = (): Promise<Category[]> =>
  get<Category[]>("/categories");

// POST /api/v1/categories
export const createCategory = (payload: CategoryPayload): Promise<Category> =>
  post<Category>("/categories", payload);

// GET /api/v1/categories/{category_id}
export const getCategory = (categoryId: number): Promise<Category> =>
  get<Category>(`/categories/${categoryId}`);

// PATCH /api/v1/categories/{category_id}
export const updateCategory = (
  categoryId: number,
  payload: Partial<CategoryPayload>
): Promise<Category> => patch<Category>(`/categories/${categoryId}`, payload);

// DELETE /api/v1/categories/{category_id}
export const deleteCategory = (categoryId: number): Promise<void> =>
  del<void>(`/categories/${categoryId}`);
