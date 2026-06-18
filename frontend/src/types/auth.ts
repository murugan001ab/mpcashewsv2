// src/pages/Login/types/auth.ts

import type { ReactNode } from "react";

// ── Form states ───────────────────────────────────────────────────────────────

export interface LoginFormState {
  email: string;
  password: string;
}

export interface RegisterFormState {
  name: string;
  email: string;
  password: string;
}

// ── Alert ─────────────────────────────────────────────────────────────────────

export interface AlertState {
  type: "error" | "success";
  msg: string;
}

// ── Left panel slide ──────────────────────────────────────────────────────────

export interface SlideItem {
  /** Full URL to the background image */
  image: string;
  quote: string;
  cite: string;
}

// ── AuthLayout ────────────────────────────────────────────────────────────────

export interface AuthLayoutProps {
  /** Right-side form content */
  children: ReactNode;
  /** Which dot is "active" in the pagination dots (mirrors the slide index) */
  activeDot?: number;
  /** Stats shown at the bottom of the left panel */
  stats?: [string, string][];
}

// ── Password strength ─────────────────────────────────────────────────────────

export interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}
