
"use client";

// src/components/profile/OrdersTab.tsx

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import ReviewForm from "./ReviewForm";
import OrderTimeline from "./OrderTimeline";
import { HOST } from "@/config/env";

import {
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface OrderProductImage {
  url: string;
  is_primary: boolean;
}

interface OrderItem {
  product_id?: number;
  product?: {
    id: number;
    name: string;
    images?: OrderProductImage[];
  };
  product_name?: string;
  quantity: number;
  unit_price: string;
}

interface OrderAddress {
  full_name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
}

interface Order {
  id: number;
  status: string;
  created_at: string;
  total_amount: string;
  address?: OrderAddress;
  items?: OrderItem[];
}

const getStatusStyles = (status?: string) => {
  const s = status?.toLowerCase();

  if (s === "delivered") {
    return "bg-green-50 text-green-600 border-green-200";
  }

  if (s === "shipped") {
    return "bg-blue-50 text-blue-600 border-blue-200";
  }

  if (s === "cancelled") {
    return "bg-red-50 text-red-600 border-red-200";
  }

  return "bg-brand-orange/10 text-brand-orange border-brand-orange/20";
};

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewedProducts, setReviewedProducts] = useState(
    new Set<number>()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ items?: Order[] } | Order[]>("orders")
      .then((res) => {
        const data = res.data as any;
        setOrders(data?.items || data || []);
      })
      .catch((err) =>
        console.error("Error loading orders:", err)
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-14 sm:py-20 text-brand-brown/50">
        <Loader2 className="animate-spin w-8 h-8 sm:w-10 sm:h-10 mb-3 sm:mb-4 text-brand-orange" />

        <p className="text-xs sm:text-sm font-bold tracking-wide">
          Loading your orders...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* =========================================================
          HEADER
      ========================================================== */}

      <div className="mb-5 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-extrabold text-brand-black tracking-tight">
          Your Orders
        </h3>

        <p className="text-xs sm:text-sm font-medium text-brand-brown/60 mt-1 leading-relaxed">
          View your order history and leave reviews for products you&apos;ve
          purchased.
        </p>
      </div>

      {/* =========================================================
          EMPTY STATE
      ========================================================== */}

      {orders.length === 0 ? (
        <div
          className="
            flex
            flex-col
            items-center
            justify-center

            py-12
            sm:py-16

            px-4

            bg-gray-50
            border
            border-brand-brown/5
            border-dashed

            text-center

            rounded-2xl
            sm:rounded-3xl
          "
        >
          <div
            className="
              w-14
              h-14
              sm:w-16
              sm:h-16
              bg-brand-orange/10
              text-brand-orange
              rounded-full
              flex
              items-center
              justify-center
              mb-4
            "
          >
            <Package size={28} strokeWidth={1.5} />
          </div>

          <p className="text-base sm:text-lg font-bold text-brand-black mb-1">
            No orders placed yet
          </p>

          <p className="text-xs sm:text-sm text-brand-brown/60 mb-6 max-w-sm leading-relaxed">
            Looks like you haven&apos;t made any purchases. When you do, they
            will appear here.
          </p>
        </div>
      ) : (
        /* =========================================================
           ORDERS
        ========================================================== */

        <div className="flex flex-col gap-3.5 sm:gap-5">
          {orders.map((order) => {
            const status = order.status?.toLowerCase();

            const isCancelled =
              status === "cancelled" ||
              status === "refunded";

            return (
              <div
                key={order.id}
                className="
                  min-w-0
                  bg-white
                  border
                  border-brand-brown/10

                  rounded-2xl
                  sm:rounded-3xl

                  overflow-hidden

                  shadow-sm
                  hover:shadow-md

                  transition-shadow
                  duration-300
                "
              >
                {/* =================================================
                    ORDER HEADER
                ================================================== */}

                <div
                  className="
                    bg-gray-50/50

                    px-3.5
                    sm:px-5
                    md:px-6

                    py-3.5
                    sm:py-4

                    flex
                    flex-col
                    sm:flex-row

                    sm:items-center
                    justify-between

                    gap-2.5
                    sm:gap-4

                    border-b
                    border-brand-brown/5
                  "
                >
                  {/* Order info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-brand-black tracking-tight">
                        Order #{order.id}
                      </span>

                      <span
                        className={`
                          text-[9px]
                          sm:text-[10px]
                          uppercase
                          tracking-widest
                          font-bold

                          px-2
                          sm:px-2.5

                          py-0.5

                          rounded-full
                          border

                          ${getStatusStyles(order.status)}
                        `}
                      >
                        {order.status?.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div
                      className="
                        flex
                        items-center
                        gap-1.5
                        text-[11px]
                        sm:text-xs
                        font-medium
                        text-brand-brown/60
                        mt-1
                      "
                    >
                      <Clock size={11} />

                      <span className="truncate">
                        {new Date(order.created_at).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between sm:block sm:text-right">
                    <p className="text-[9px] sm:text-xs font-semibold text-brand-brown/50 uppercase tracking-widest">
                      Order Total
                    </p>

                    <p className="text-base sm:text-lg font-extrabold text-brand-black">
                      ₹{order.total_amount}
                    </p>
                  </div>
                </div>

                {/* =================================================
                    ORDER BODY
                ================================================== */}

                <div className="p-3.5 sm:p-5 md:p-6">
                  {/* Timeline */}
                  <div
                    className={`
                      ${
                        !isCancelled
                          ? "mb-5 pb-5 sm:mb-6 sm:pb-6 border-b border-brand-brown/5"
                          : "mb-5 sm:mb-6"
                      }
                    `}
                  >
                    <OrderTimeline status={order.status} />
                  </div>

                  {/* =================================================
                      DELIVERY ADDRESS
                  ================================================== */}

                  {order.address && (
                    <div
                      className="
                        flex
                        items-start
                        gap-2.5
                        sm:gap-3

                        bg-brand-cream/20
                        border
                        border-brand-brown/5

                        rounded-xl

                        p-3
                        sm:p-4

                        mb-5
                        sm:mb-6

                        min-w-0
                      "
                    >
                      <MapPin
                        size={16}
                        className="
                          text-brand-orange
                          mt-0.5
                          flex-shrink-0
                        "
                      />

                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-brand-black mb-1 break-words">
                          Deliver to:{" "}
                          <span className="text-brand-orange">
                            {order.address.full_name}
                          </span>
                        </p>

                        <p className="text-[11px] sm:text-xs text-brand-brown/70 leading-relaxed break-words">
                          {order.address.address_line1}

                          {order.address.address_line2
                            ? `, ${order.address.address_line2}`
                            : ""}

                          {`, ${order.address.city}, ${order.address.state} - `}

                          <span className="font-semibold text-brand-black">
                            {order.address.postal_code}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* =================================================
                      ITEMS
                  ================================================== */}

                  <div className="flex flex-col gap-3.5 sm:gap-5">
                    <h4
                      className="
                        text-[10px]
                        sm:text-xs
                        font-bold
                        text-brand-brown/40
                        uppercase
                        tracking-widest
                      "
                    >
                      Items in this order
                    </h4>

                    <div className="divide-y divide-brand-brown/5 border-t border-brand-brown/5">
                      {(order.items || []).map((item, idx) => {
                        const productId =
                          item.product_id || item.product?.id;

                        const productName =
                          item.product_name ||
                          item.product?.name ||
                          "Product";

                        const primaryImage =
                          item.product?.images?.find(
                            (i) => i.is_primary
                          ) ??
                          item.product?.images?.[0];

                        const productImage = primaryImage
                          ? primaryImage.url.startsWith("http")
                            ? primaryImage.url
                            : `${HOST}${primaryImage.url}`
                          : null;

                        const alreadyReviewed =
                          reviewedProducts.has(productId!);

                        return (
                          <div
                            key={`${order.id}-${idx}`}
                            className="
                              py-3.5
                              sm:py-5

                              flex
                              flex-col

                              gap-3
                              sm:gap-4

                              min-w-0
                            "
                          >
                            {/* Product */}
                            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                              {/* Image */}
                              <div
                                className="
                                  w-12
                                  h-12
                                  sm:w-16
                                  sm:h-16

                                  bg-gray-50

                                  rounded-lg
                                  sm:rounded-xl

                                  overflow-hidden

                                  border
                                  border-brand-brown/5

                                  flex-shrink-0
                                "
                              >
                                {productImage ? (
                                  <img
                                    src={productImage}
                                    alt={productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-brand-brown/20">
                                    <Package size={18} />
                                  </div>
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex flex-col min-w-0 flex-1">
                                <h5
                                  className="
                                    text-xs
                                    sm:text-sm
                                    font-bold
                                    text-brand-black

                                    line-clamp-2
                                    sm:line-clamp-1

                                    mb-1
                                    break-words
                                  "
                                >
                                  {productName}
                                </h5>

                                <div
                                  className="
                                    flex
                                    items-center
                                    gap-2.5

                                    text-[10px]
                                    sm:text-xs

                                    font-medium
                                    text-brand-brown/60

                                    flex-wrap
                                  "
                                >
                                  <span>
                                    Qty:{" "}
                                    <strong className="text-brand-black">
                                      {item.quantity}
                                    </strong>
                                  </span>

                                  <span className="w-1 h-1 bg-brand-brown/20 rounded-full" />

                                  <span>
                                    ₹{item.unit_price} / unit
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* =================================================
                                REVIEW
                            ================================================== */}

                            <div className="w-full sm:flex sm:justify-end">
                              {status !== "delivered" ? (
                                <span
                                  className="
                                    text-[10px]
                                    sm:text-xs
                                    font-semibold
                                    text-brand-brown/40
                                    italic
                                  "
                                >
                                  Review available after delivery
                                </span>
                              ) : alreadyReviewed ? (
                                <div
                                  className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-1.5

                                    text-[10px]
                                    sm:text-xs

                                    font-bold
                                    text-green-600

                                    bg-green-50

                                    px-3
                                    py-1.5

                                    rounded-lg

                                    border
                                    border-green-100

                                    w-fit
                                  "
                                >
                                  <CheckCircle2
                                    size={13}
                                    strokeWidth={2.5}
                                  />

                                  Reviewed
                                </div>
                              ) : (
                                <div className="w-full sm:min-w-[120px] sm:w-auto">
                                  <ReviewForm
                                    productId={productId!}
                                    productName={productName}
                                    onSubmitted={(id) =>
                                      setReviewedProducts(
                                        (prev) =>
                                          new Set(prev).add(id)
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

