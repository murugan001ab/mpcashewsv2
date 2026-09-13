
"use client";

// src/components/profile/OrderTimeline.tsx
// Visual step tracker for a customer's order:
// Placed -> Confirmed -> Packed -> Shipped -> Delivered.
// Collapses to a cancelled/refunded banner instead of a stepper when relevant.

import React from "react";
import {
  Package,
  CheckCircle2,
  Box,
  Truck,
  Home,
  XCircle,
} from "lucide-react";

const STEPS = [
  {
    key: "pending",
    label: "Placed",
    icon: Package,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: CheckCircle2,
  },
  {
    key: "processing",
    label: "Packed",
    icon: Box,
  },
  {
    key: "shipped",
    label: "Shipped",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: Home,
  },
] as const;

// Every backend status maps onto one of the 5 visual steps.
// "out_for_delivery" is folded into "Shipped".
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

export default function OrderTimeline({
  status,
}: OrderTimelineProps) {
  const s = status?.toLowerCase?.() ?? "";

  /* ============================================================
     CANCELLED / REFUNDED
  ============================================================ */

  if (s === "cancelled" || s === "refunded") {
    return (
      <div
        className="
          flex
          items-center
          gap-2.5

          bg-red-50
          border
          border-red-100

          text-red-600

          rounded-xl

          px-3
          sm:px-4

          py-2.5
          sm:py-3

          text-[11px]
          sm:text-xs

          font-bold
        "
      >
        <XCircle
          size={16}
          className="shrink-0"
          strokeWidth={2.5}
        />

        <span>
          {s === "cancelled"
            ? "This order was cancelled"
            : "This order was refunded"}
        </span>
      </div>
    );
  }

  const currentIndex = STEP_INDEX[s] ?? 0;

  /* ============================================================
     ORDER STEPPER
  ============================================================ */

  return (
    <div className="w-full">
      <div className="flex items-start w-full">
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div
                className="
                  flex
                  flex-col
                  items-center

                  gap-1.5

                  shrink-0

                  w-[52px]
                  xs:w-14
                  sm:w-16
                  md:w-20
                "
              >
                {/* Circle */}
                <div
                  className={`
                    w-7
                    h-7

                    sm:w-8
                    sm:h-8

                    md:w-9
                    md:h-9

                    rounded-full

                    flex
                    items-center
                    justify-center

                    border-2

                    transition-all
                    duration-300

                    ${
                      isDone
                        ? "bg-brand-orange border-brand-orange text-white"
                        : "bg-white border-brand-brown/15 text-brand-brown/30"
                    }

                    ${
                      isCurrent
                        ? "ring-3 sm:ring-4 ring-brand-orange/15"
                        : ""
                    }
                  `}
                >
                  <Icon
                    size={13}
                    className="sm:w-[15px] sm:h-[15px]"
                    strokeWidth={2.5}
                  />
                </div>

                {/* Label */}
                <span
                  className={`
                    text-[8px]
                    sm:text-[10px]
                    md:text-[11px]

                    font-bold
                    uppercase

                    tracking-[0.04em]
                    sm:tracking-wide

                    text-center
                    leading-tight

                    ${
                      isDone
                        ? "text-brand-black"
                        : "text-brand-brown/35"
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={`
                    flex-1

                    min-w-[6px]
                    sm:min-w-[10px]

                    h-[2px]

                    mt-[13px]
                    sm:mt-[15px]
                    md:mt-[17px]

                    rounded-full

                    transition-colors
                    duration-300

                    ${
                      idx < currentIndex
                        ? "bg-brand-orange"
                        : "bg-brand-brown/10"
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
