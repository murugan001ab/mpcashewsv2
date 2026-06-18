// src/services/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel export — import any service from "@/services" instead of deep paths.
//
// Usage:
//   import { login, logout } from "@/services";
//   import * as authService from "@/services/authService";
// ─────────────────────────────────────────────────────────────────────────────

export * as authService   from "./authService";
export * as userService   from "./userService";
export * as productService from "./productService";
export * as cartService   from "./cartService";
export * as wishlistService from "./wishlistService";
export * as orderService  from "./orderService";
export * as paymentService from "./paymentService";
export * as deliveryService from "./deliveryService";
export * as adminService  from "./adminService";
export * as healthService from "./healthService";

// Default api instance — use only when you need raw Axios access
export { default as api }  from "./api";
