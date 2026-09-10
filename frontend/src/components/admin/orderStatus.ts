// src/components/admin/orderStatus.ts
// Single source of truth for how each order status is labelled and colored,
// so the dashboard's "pending" stat, the orders table badge, and the status
// dropdown all agree with each other.
import type { AdminOrderStatus } from "@/types";
import type { BadgeTone } from "./ui";

export const ORDER_STATUSES: AdminOrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const LABELS: Record<AdminOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TONES: Record<AdminOrderStatus, BadgeTone> = {
  pending: "amber",
  confirmed: "blue",
  processing: "blue",
  out_for_delivery: "blue",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
  refunded: "red",
};

export const orderStatusLabel = (status: AdminOrderStatus): string => LABELS[status] ?? status;
export const orderStatusTone = (status: AdminOrderStatus): BadgeTone => TONES[status] ?? "neutral";
