// src/config/env.ts
// Single source of truth for all environment variables.
// Import from here instead of sprinkling import.meta.env across files.

export const API_BASE_URL   = import.meta.env.VITE_API_BASE_URL  as string;
export const HOST            = (import.meta.env.VITE_HOST || "")  as string;
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

/** Resolve a relative server path to an absolute URL */
export const assetUrl = (path?: string | null): string | null => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${HOST}${path}`;
};
