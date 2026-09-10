// src/config/env.ts
// Single source of truth for all environment variables.
// Import from here instead of sprinkling process.env across files.
// NOTE: ported from Vite's import.meta.env.VITE_* -> Next's process.env.NEXT_PUBLIC_*

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;
export const HOST = (process.env.NEXT_PUBLIC_HOST || "") as string;
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string;

/** Resolve a relative server path to an absolute URL */
export const assetUrl = (path?: string | null): string | null => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${HOST}${path}`;
};
