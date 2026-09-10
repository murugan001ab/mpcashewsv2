"use client";
// src/components/profile/OrderTimeline.tsx
// Visual step tracker for a customer's order: Placed -> Confirmed -> Packed -> Shipped -> Delivered.
// Collapses to a cancelled/refunded banner instead of a stepper when relevant.
import React from "react";
import { Package, CheckCircle2, Box, Truck, Home, XCircle } from "lucide-react";

const STEPS = [
  { key: "pending", label: "Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Packed", icon: Box },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const;

// Every backend status value maps onto one of the 5 visual steps above.
// "out_for_delivery" is folded into the "Shipped" step since, from the
// customer's point of view, the order is simply on its way at that point.
const STEP_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  out_for_delivery: 3,
  shipped: 3,
  delivered: 4,
};

interface OrderTimelineProps {
  status?: string;
}

export default function OrderTimeline({ status }: OrderTimelineProps) {
  const s = status?.toLowerCase?.() ?? "";

  if (s === "cancelled" || s === "refunded") {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-xs font-bold">
        <XCircle size={16} strokeWidth={2.5} />
        {s === "cancelled" ? "This order was cancelled" : "This order was refunded"}
      </div>
    );
  }

  const currentIndex = STEP_INDEX[s] ?? 0;

  return (
    <div className="flex items-start w-full overflow-x-auto pb-1">
      {STEPS.map((step, idx) => {
        const isDone = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        const Icon = step.icon;
        const isLast = idx === STEPS.length - 1;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5 shrink-0 w-14 md:w-20">
              <div
                className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isDone
                    ? "bg-brand-orange border-brand-orange text-white"
                    : "bg-white border-brand-brown/15 text-brand-brown/30"
                } ${isCurrent ? "ring-4 ring-brand-orange/15" : ""}`}
              >
                <Icon size={15} strokeWidth={2.5} />
              </div>
              <span
                className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center leading-tight ${
                  isDone ? "text-brand-black" : "text-brand-brown/35"
                }`}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={`flex-1 min-w-[16px] h-[2px] mt-4 md:mt-4.5 rounded-full transition-colors duration-300 ${
                  idx < currentIndex ? "bg-brand-orange" : "bg-brand-brown/10"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
