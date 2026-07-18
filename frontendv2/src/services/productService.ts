// src/services/productService.ts
import { get, post, patch, del, postForm } from "./api";
import type {
  Product,
  ProductPayload,
  ProductListParams,
  Category,
  CategoryPayload,
  PaginatedResponse,
} from "@/types";

// ── Products ────────────────────────────────────────────────────────────────
export const listProducts = (params?: ProductListParams): Promise<PaginatedResponse<Product>> =>
  get<PaginatedResponse<Product>>("/products", { params });

export const createProduct = (payload: ProductPayload): Promise<Product> =>
  post<Product>("/products", payload);

export const getProduct = (productId: string): Promise<Product> => get<Product>(`/products/${productId}`);

export const updateProduct = (productId: string, payload: Partial<ProductPayload>): Promise<Product> =>
  patch<Product>(`/products/${productId}`, payload);

export const deleteProduct = (productId: string): Promise<void> => del<void>(`/products/${productId}`);

export const getProductBySlug = (slug: string): Promise<Product> => get<Product>(`/products/slug/${slug}`);

export const uploadProductImage = (productId: string, formData: FormData): Promise<Product> =>
  postForm<Product>(`/products/${productId}/images`, formData);

export const deleteProductImage = (productId: string, imageId: string): Promise<void> =>
  del<void>(`/products/${productId}/images/${imageId}`);

// ── Categories ──────────────────────────────────────────────────────────────
export const listCategories = (): Promise<Category[]> => get<Category[]>("/categories");

export const createCategory = (payload: CategoryPayload): Promise<Category> =>
  post<Category>("/categories", payload);

export const getCategory = (categoryId: string): Promise<Category> => get<Category>(`/categories/${categoryId}`);

export const updateCategory = (categoryId: string, payload: Partial<CategoryPayload>): Promise<Category> =>
  patch<Category>(`/categories/${categoryId}`, payload);

export const deleteCategory = (categoryId: string): Promise<void> => del<void>(`/categories/${categoryId}`);
