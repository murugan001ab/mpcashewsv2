"use client";
// src/components/admin/ui.tsx
//
// Shared primitives for the admin panel. One file on purpose — these are
// small, used everywhere, and keeping them together makes the admin's
// visual language easy to audit in one pass.
//
// Design tokens (see globals.css for the brand.* colors these build on):
//   Canvas   #F7F5F2 — quiet neutral, distinct from the storefront's cream
//   Sidebar  brand-black — dark, roasted-shell tone, ties to the storefront's CTA color
//   Accent   brand-orange — reserved for the active nav item + primary actions only
//   Status   green = good/delivered · amber = pending/low · red = cancelled/out · blue = in-transit
import React from "react";
import { LucideIcon, Loader2 } from "lucide-react";

// ── Page header ───────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-7">
      <div>
        <h1 className="text-[22px] font-bold text-brand-black tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-brand-brown/60 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-brand-orange text-white hover:bg-[#cf7409] shadow-sm",
    secondary: "bg-white text-brand-black border border-brand-brown/15 hover:border-brand-brown/30",
    ghost: "text-brand-brown/70 hover:text-brand-black hover:bg-brand-brown/5",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg text-brand-brown/60 hover:text-brand-black hover:bg-brand-brown/8 transition-colors ${className}`}
      {...rest}
    />
  );
}

// ── Status badge ──────────────────────────────────────────────────────────
export type BadgeTone = "green" | "amber" | "red" | "blue" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-600 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-brand-brown/5 text-brand-brown/70 border-brand-brown/15",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: BadgeTone;
  hint?: string;
}) {
  const iconTones: Record<BadgeTone, string> = {
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    neutral: "bg-brand-orange/10 text-brand-orange",
  };
  return (
    <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-brand-brown/50 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-brand-black mt-2 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-brand-brown/45 mt-1">{hint}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconTones[tone]}`}>
        <Icon size={19} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-brand-brown/5 flex items-center justify-center text-brand-brown/40 mb-4">
        <Icon size={26} />
      </div>
      <p className="font-semibold text-brand-black">{title}</p>
      {description && <p className="text-sm text-brand-brown/55 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────
export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-brand-brown/50">
      <Loader2 size={24} className="animate-spin mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Inline error notice ───────────────────────────────────────────────────
export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-4">
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white rounded-2xl shadow-xl border border-brand-brown/10 overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-brown/10">
          <h3 className="font-bold text-brand-black">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-brown/50 hover:bg-brand-brown/8 hover:text-brand-black"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form field wrapper ────────────────────────────────────────────────────
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-brand-brown/70 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-brand-brown/45 mt-1">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl border border-brand-brown/15 bg-white text-sm text-brand-black placeholder:text-brand-brown/35 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/40 transition";
