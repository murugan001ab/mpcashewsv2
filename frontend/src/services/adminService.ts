// src/services/adminService.ts
// Maps every /api/v1/admin/* endpoint.
// All routes require the authenticated user to have role === "admin".

import api from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_users: number;
  total_orders: number;
  total_revenue: string;
  total_products: number;
  pending_orders: number;
  low_stock_products: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: string;
  orders: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_sold: number;
  revenue: string;
}

export interface InventoryItem {
  product_id: string;
  name: string;
  sku: string;
  stock: number;
  status: "ok" | "low" | "out";
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  weight_grams: number;
  price: string;
  discounted_price?: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  is_active: boolean;
  is_featured: boolean;
  category_id: string;
  category: Category;
  variants: ProductVariant[];
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  product_name: string;
  product_sku: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: string;
  tax_amount: string;
  shipping_amount: string;
  discount_amount: string;
  total_amount: string;
  notes?: string;
  items: OrderItem[];
  address: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductVariantPayload {
  sku: string;
  weight_grams: number;
  price: string;
  discounted_price?: string;
  stock: number;
  is_active?: boolean;
}

export interface ProductPayload {
  name: string;
  description?: string;
  short_description?: string;
  is_featured?: boolean;
  is_active?: boolean;
  category_id: string;
  variants?: ProductVariantPayload[];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = (): Promise<DashboardStats> =>
  api.get<DashboardStats>("/admin/dashboard").then(r => r.data);

export const getRevenueByMonth = (): Promise<RevenueByMonth[]> =>
  api.get<RevenueByMonth[]>("/admin/revenue").then(r => r.data);

export const getTopProducts = (limit = 10): Promise<TopProduct[]> =>
  api.get<TopProduct[]>("/admin/top-products", { params: { limit } }).then(r => r.data);

export const getInventoryReport = (): Promise<InventoryItem[]> =>
  api.get<InventoryItem[]>("/admin/inventory").then(r => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────

export const listUsers = (params?: {
  page?: number;
  page_size?: number;
}): Promise<AdminUser[]> =>
  api.get<AdminUser[]>("/admin/users", { params }).then(r => r.data);

export const toggleUserActive = (userId: string): Promise<AdminUser> =>
  api.patch<AdminUser>(`/admin/users/${userId}/toggle-active`).then(r => r.data);

// ── Orders ────────────────────────────────────────────────────────────────────

export const listAllOrders = (params?: {
  page?: number;
  page_size?: number;
  status?: OrderStatus;
}): Promise<PaginatedResponse<Order>> =>
  api.get<PaginatedResponse<Order>>("/admin/orders", { params }).then(r => r.data);

export const updateOrderStatus = (
  orderId: string,
  status: OrderStatus,
  tracking_id?: string
): Promise<Order> =>
  api
    .patch<Order>(
      `/admin/orders/${orderId}/status`,
      { status },
      { params: tracking_id ? { tracking_id } : undefined }
    )
    .then(r => r.data);

// ── Categories ────────────────────────────────────────────────────────────────

export const adminListCategories = (): Promise<Category[]> =>
  api.get<Category[]>("/admin/categories").then(r => r.data);

export const adminGetCategory = (categoryId: string): Promise<Category> =>
  api.get<Category>(`/admin/categories/${categoryId}`).then(r => r.data);

export const adminCreateCategory = (payload: CategoryPayload): Promise<Category> =>
  api.post<Category>("/admin/categories", payload).then(r => r.data);

export const adminUpdateCategory = (
  categoryId: string,
  payload: Partial<CategoryPayload>
): Promise<Category> =>
  api.patch<Category>(`/admin/categories/${categoryId}`, payload).then(r => r.data);

export const adminDeleteCategory = (categoryId: string): Promise<void> =>
  api.delete<void>(`/admin/categories/${categoryId}`).then(r => r.data);

// ── Products ──────────────────────────────────────────────────────────────────

export const adminListProducts = (params?: {
  page?: number;
  page_size?: number;
}): Promise<Product[]> =>
  api.get<Product[]>("/admin/products", { params }).then(r => r.data);

export const adminGetProduct = (productId: string): Promise<Product> =>
  api.get<Product>(`/admin/products/${productId}`).then(r => r.data);

export const adminCreateProduct = (payload: ProductPayload): Promise<Product> =>
  api.post<Product>("/admin/products", payload).then(r => r.data);

export const adminUpdateProduct = (
  productId: string,
  payload: Partial<ProductPayload>
): Promise<Product> =>
  api.patch<Product>(`/admin/products/${productId}`, payload).then(r => r.data);

export const adminDeleteProduct = (productId: string): Promise<void> =>
  api.delete<void>(`/admin/products/${productId}`).then(r => r.data);
