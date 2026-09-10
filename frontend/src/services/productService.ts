// src/services/productService.ts
import { get, post, patch, del, postForm } from "./api";
import type {
  Product,
  ProductPayload,
  ProductListParams,
  Category,
  CategoryPayload,
  PaginatedResponse,
  Variant,
  ProductVariantPayload,
  AdminProductCreatePayload,
  ProductImage,
} from "@/types";

// ── Products ────────────────────────────────────────────────────────────────
export const listProducts = (params?: ProductListParams): Promise<PaginatedResponse<Product>> =>
  get<PaginatedResponse<Product>>("/products", { params });

export const createProduct = (payload: ProductPayload | AdminProductCreatePayload): Promise<Product> =>
  post<Product>("/products", payload);

export const getProduct = (productId: string): Promise<Product> => get<Product>(`/products/${productId}`);

export const updateProduct = (productId: string, payload: Partial<ProductPayload>): Promise<Product> =>
  patch<Product>(`/products/${productId}`, payload);

export const deleteProduct = (productId: string): Promise<void> => del<void>(`/products/${productId}`);

export const getProductBySlug = (slug: string): Promise<Product> => get<Product>(`/products/slug/${slug}`);

// Backend returns the created ProductImageResponse, not the full Product —
// callers that need the updated image list should re-fetch the product.
export const uploadProductImage = (
  productId: string,
  formData: FormData,
  config?: { params?: Record<string, unknown> }
): Promise<ProductImage> => postForm<ProductImage>(`/products/${productId}/images`, formData, config);

export const deleteProductImage = (productId: string, imageId: string): Promise<void> =>
  del<void>(`/products/${productId}/images/${imageId}`);

// ── Variants ──────────────────────────────────────────────────────────────
export const createVariant = (productId: string, payload: ProductVariantPayload): Promise<Variant> =>
  post<Variant>(`/products/${productId}/variants`, payload);

export const updateVariant = (variantId: string, payload: Partial<ProductVariantPayload>): Promise<Variant> =>
  patch<Variant>(`/variants/${variantId}`, payload);

export const deleteVariant = (variantId: string): Promise<void> => del<void>(`/variants/${variantId}`);

// ── Categories ──────────────────────────────────────────────────────────────
export const listCategories = (): Promise<Category[]> => get<Category[]>("/categories");

export const createCategory = (payload: CategoryPayload): Promise<Category> =>
  post<Category>("/categories", payload);

export const getCategory = (categoryId: string): Promise<Category> => get<Category>(`/categories/${categoryId}`);

export const updateCategory = (categoryId: string, payload: Partial<CategoryPayload>): Promise<Category> =>
  patch<Category>(`/categories/${categoryId}`, payload);

export const deleteCategory = (categoryId: string): Promise<void> => del<void>(`/categories/${categoryId}`);
