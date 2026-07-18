// src/types/index.ts
// Shared TypeScript types used across services/components/pages.
// NOTE: in the old Vite app, authService.ts and userService.ts both did
// `import type {...} from "../types"` but no such index file existed —
// only types/auth.ts (form/UI types) was present. This file is the missing
// piece; it both fixes that broken import and gives every domain a home.

// ── User / Auth ────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "admin" | "customer" | string;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface PhoneSendOtpPayload {
  phone: string;
}

export interface PhoneVerifyOtpPayload {
  phone: string;
  code: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

// ── Addresses ──────────────────────────────────────────────────────────────
export interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export type AddressPayload = Omit<Address, "id">;

// ── Catalog ────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  image_url?: string;
  image?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  weight_grams: number;
  price: string;
  discounted_price?: string;
  stock: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  is_active: boolean;
  is_featured: boolean;
  category: Category;
  variants: Variant[];
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type PaginatedResponse<T> = Paginated<T>;
export type PaginatedProducts = Paginated<Product>;

export interface ProductListParams {
  q?: string;
  category_id?: string;
  is_featured?: boolean;
  page?: number;
  page_size?: number;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  is_active?: boolean;
  is_featured?: boolean;
  category_id: string;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  is_active?: boolean;
}

// ── Cart ───────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  quantity: number;
  price_at_add: string;
  subtotal: string;
  product: Product;
  variant: Variant;
}

export interface CartSummary {
  cart_id: string;
  items: CartItem[];
  item_count: number;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
}

// ── Wishlist ───────────────────────────────────────────────────────────────
export interface WishlistItem {
  id: string;
  product: Product;
}

export interface WishlistResponse {
  id: string;
  items: WishlistItem[];
  total: number;
}

// ── Orders ─────────────────────────────────────────────────────────────────
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  status: OrderStatus;
  address_id: string;
  notes?: string;
  items: CartItem[];
  total: string;
  created_at: string;
}

export type PaginatedOrders = Paginated<Order>;

// ── Payments ───────────────────────────────────────────────────────────────
export interface PaymentCreateResponse {
  razorpay_order_id: string;
  amount: number; // paise
  currency: string;
  payment_id: string;
}

export interface PaymentVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type PaginatedPayments = Paginated<{
  id: string;
  amount: number;
  status: string;
  created_at: string;
}>;

// ── Delivery ───────────────────────────────────────────────────────────────
export interface DeliveryTracking {
  awb_code: string;
  current_status: string;
  courier_name: string;
  tracking_url: string;
  activities: { status: string; timestamp: string; location?: string }[];
}

// ── Admin ──────────────────────────────────────────────────────────────────
export interface AdminDashboard {
  total_users: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  pending_orders: number;
  low_stock_products: number;
}

export interface InventoryRow {
  product_id: string;
  name: string;
  sku: string;
  stock: number;
  status: "ok" | "low" | "out";
}
