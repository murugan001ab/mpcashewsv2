// src/services/adminService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/admin/* endpoint.
// All routes require the authenticated user to have role === "admin".
// ─────────────────────────────────────────────────────────────────────────────

import { get, patch, post, del } from "./api";
import type {
  DashboardStats,
  RevenueByMonth,
  TopProduct,
  InventoryItem,
  AdminUser,
  Order,
  OrderStatus,
  UpdateOrderStatusPayload,
  Product,
  ProductPayload,
  Category,
  CategoryPayload,
  PaginatedResponse,
} from "../types";

// ── Dashboard ─────────────────────────────────────────────────────────────────
// GET /api/v1/admin/dashboard
export const getDashboardStats = (): Promise<DashboardStats> =>
  get<DashboardStats>("/admin/dashboard");

// GET /api/v1/admin/revenue
export const getRevenueByMonth = (): Promise<RevenueByMonth[]> =>
  get<RevenueByMonth[]>("/admin/revenue");

// GET /api/v1/admin/top-products
export const getTopProducts = (limit = 10): Promise<TopProduct[]> =>
  get<TopProduct[]>("/admin/top-products", { params: { limit } });

// GET /api/v1/admin/inventory
export const getInventoryReport = (): Promise<InventoryItem[]> =>
  get<InventoryItem[]>("/admin/inventory");

// ── Users ─────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/users
export const listUsers = (params?: {
  page?: number;
  size?: number;
  search?: string;
}): Promise<PaginatedResponse<AdminUser>> =>
  get<PaginatedResponse<AdminUser>>("/admin/users", { params });

// PATCH /api/v1/admin/users/{user_id}/toggle-active
export const toggleUserActive = (userId: number): Promise<AdminUser> =>
  patch<AdminUser>(`/admin/users/${userId}/toggle-active`);

// ── Orders ────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/orders
export const listAllOrders = (params?: {
  page?: number;
  size?: number;
  status?: OrderStatus;
}): Promise<PaginatedResponse<Order>> =>
  get<PaginatedResponse<Order>>("/admin/orders", { params });

// PATCH /api/v1/admin/orders/{order_id}/status
export const updateOrderStatus = (
  orderId: number,
  payload: UpdateOrderStatusPayload
): Promise<Order> =>
  patch<Order>(`/admin/orders/${orderId}/status`, payload);

// ── Categories ────────────────────────────────────────────────────────────────
// GET /api/v1/admin/categories
export const adminListCategories = (): Promise<Category[]> =>
  get<Category[]>("/admin/categories");

// POST /api/v1/admin/categories
export const adminCreateCategory = (
  payload: CategoryPayload
): Promise<Category> => post<Category>("/admin/categories", payload);

// GET /api/v1/admin/categories/{category_id}
export const adminGetCategory = (categoryId: number): Promise<Category> =>
  get<Category>(`/admin/categories/${categoryId}`);

// PATCH /api/v1/admin/categories/{category_id}
export const adminUpdateCategory = (
  categoryId: number,
  payload: Partial<CategoryPayload>
): Promise<Category> =>
  patch<Category>(`/admin/categories/${categoryId}`, payload);

// DELETE /api/v1/admin/categories/{category_id}
export const adminDeleteCategory = (categoryId: number): Promise<void> =>
  del<void>(`/admin/categories/${categoryId}`);

// ── Products ──────────────────────────────────────────────────────────────────
// GET /api/v1/admin/products
export const adminListProducts = (params?: {
  page?: number;
  size?: number;
  category_id?: number;
  search?: string;
}): Promise<PaginatedResponse<Product>> =>
  get<PaginatedResponse<Product>>("/admin/products", { params });

// POST /api/v1/admin/products
export const adminCreateProduct = (payload: ProductPayload): Promise<Product> =>
  post<Product>("/admin/products", payload);

// GET /api/v1/admin/products/{product_id}
export const adminGetProduct = (productId: number): Promise<Product> =>
  get<Product>(`/admin/products/${productId}`);

// PATCH /api/v1/admin/products/{product_id}
export const adminUpdateProduct = (
  productId: number,
  payload: Partial<ProductPayload>
): Promise<Product> =>
  patch<Product>(`/admin/products/${productId}`, payload);

// DELETE /api/v1/admin/products/{product_id}
export const adminDeleteProduct = (productId: number): Promise<void> =>
  del<void>(`/admin/products/${productId}`);
