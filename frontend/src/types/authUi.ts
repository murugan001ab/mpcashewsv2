// src/types/authUi.ts
// Form/UI-only types for the auth pages (ported from old types/auth.ts).
// Kept separate from src/types/index.ts (API/domain types) on purpose —
// these never touch the network.
import type { ReactNode } from "react";

export interface LoginFormState {
  email: string;
  password: string;
}

export interface RegisterFormState {
  name: string;
  email: string;
  password: string;
}

export interface AlertState {
  type: "error" | "success";
  msg: string;
}

export interface SlideItem {
  image: string;
  quote: string;
  cite: string;
}

export interface AuthLayoutProps {
  children: ReactNode;
  activeDot?: number;
  stats?: [string, string][];
}

export interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}
