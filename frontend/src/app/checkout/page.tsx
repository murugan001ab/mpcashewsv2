"use client";

// src/app/checkout/page.tsx
// Address selection + Razorpay payment.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Loader2,
  CheckCircle2,
  Package,
  ArrowLeft,
  ShieldCheck,
  Tag,
  X,
  Plus,
  AlertCircle,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import * as addressService from "@/services/addressService";
import type { Address } from "@/services/addressService";
import AddressForm, {
  EMPTY_ADDRESS_FORM,
  type AddressFormState,
} from "@/components/AddressForm";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import * as couponService from "@/services/couponService";
import { getErrorMessage } from "@/utils/apiError";
import { RAZORPAY_KEY_ID } from "@/config/env";

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Razorpay: new (
      options: Record<string, unknown>
    ) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

function CheckoutContent() {
  const router = useRouter();
  const { cartItems: cart, clearCart, totals } = useCart();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rzpRef = useRef<RazorpayInstance | null>(null);

  const [addressForm, setAddressForm] =
    useState<AddressFormState | null>(null);

  const [savingAddress, setSavingAddress] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);

  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      rzpRef.current?.close();
      rzpRef.current = null;
    };
  }, []);

  useEffect(() => {
    loadAddresses();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAddresses = () => {
    setLoadingAddresses(true);

    return addressService
      .getAddresses()
      .then((list) => {
        setAddresses(list);

        const def =
          list.find((a) => a.is_default) ?? list[0];

        if (def) {
          setSelectedId((prev) => prev ?? def.id);
        }

        return list;
      })
      .catch((e) => {
        console.error(e);
        return [];
      })
      .finally(() => setLoadingAddresses(false));
  };

  const handleSaveNewAddress = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!addressForm) return;

    setSavingAddress(true);

    try {
      const created = await addressService.addAddress(
        addressForm as Omit<Address, "id">
      );

      setAddressForm(null);

      const list = await loadAddresses();

      setSelectedId(
        created.id ??
          list.find((a) => a.is_default)?.id ??
          null
      );
    } catch (e) {
      console.error(e);
      alert("Failed to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const {
    subtotal,
    tax,
    shipping,
    total: totalBeforeDiscount,
  } = totals;

  const discount = appliedCoupon?.discount ?? 0;

  const total = Math.max(
    totalBeforeDiscount - discount,
    0
  );

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || applyingCoupon) return;

    setApplyingCoupon(true);
    setCouponError(null);

    try {
      const res = await couponService.applyCoupon(
        couponInput.trim()
      );

      setAppliedCoupon({
        code: res.code,
        discount: parseFloat(res.discount_amount),
      });
    } catch (e) {
      setAppliedCoupon(null);

      setCouponError(
        getErrorMessage(
          e,
          "That coupon couldn't be applied."
        )
      );
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handlePlaceOrder = async () => {
    if (placing) return;

    if (!selectedId) {
      setError("Please select a delivery address.");
      return;
    }

    setError(null);
    setPlacing(true);

    try {
      const order = await orderService.createOrder({
        address_id: selectedId,
        coupon_code: appliedCoupon?.code,
      });

      const payment =
        await paymentService.createPaymentOrder(order.id);

      const ok = await loadRazorpayScript();

      if (!ok) {
        setError(
          "Couldn't load the payment gateway. Please check your connection and try again."
        );

        setPlacing(false);
        return;
      }

      const selectedAddress = addresses.find(
        (a) => a.id === selectedId
      );

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpay_order_id,
        name: "MP Cashews",
        description: `Order ${order.order_number}`,

        prefill: {
          name:
            selectedAddress?.name ||
            user?.full_name ||
            "",

          email: user?.email || "",

          contact:
            selectedAddress?.phone_number || "",
        },

        theme: {
          color: "#E8820C",
        },

        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await paymentService.verifyPayment(
              response
            );

            rzp.close();
            rzpRef.current = null;

            await clearCart();

            router.push("/profile?tab=orders");
          } catch (e) {
            console.error(e);

            rzp.close();
            rzpRef.current = null;

            setError(
              "Payment verification failed. If money was deducted, it will be refunded shortly."
            );

            setPlacing(false);
          }
        },

        modal: {
          ondismiss: () => {
            rzpRef.current = null;
            setPlacing(false);
          },
        },
      });

      rzpRef.current = rzp;
      rzp.open();
    } catch (e) {
      console.error(e);

      setError(
        "Couldn't place your order. Please try again."
      );

      setPlacing(false);
    }
  };

  /* -------------------------------------------------------
     EMPTY CART
  ------------------------------------------------------- */

  if (!cart.length) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center px-5 pt-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange shadow-sm sm:h-24 sm:w-24">
          <Package
            size={34}
            strokeWidth={2}
          />
        </div>

        <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-brand-black sm:text-3xl">
          Your cart is empty
        </h2>

        <p className="mb-7 max-w-md text-sm leading-relaxed text-brand-brown/60 sm:text-base">
          Add something to your cart before checking out.
        </p>

        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-brand-orange px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:bg-brand-brown sm:px-8"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div
      className="
        min-h-screen
        w-full
        px-4
        pt-24
        pb-[125px]
        sm:px-5
        sm:pt-28
        sm:pb-[130px]
        md:px-6
        md:pt-32
        lg:px-8
        lg:pb-16
      "
    >
      <div className="mx-auto w-full max-w-6xl">

        {/* -------------------------------------------------------
            BACK TO CART
        ------------------------------------------------------- */}

        <button
          onClick={() => router.push("/cart")}
          className="
            mb-5
            flex
            min-h-10
            items-center
            gap-1.5
            rounded-lg
            text-xs
            font-bold
            text-brand-brown/60
            transition-colors
            hover:text-brand-orange
            sm:mb-7
            sm:text-sm
          "
        >
          <ArrowLeft
            size={16}
            strokeWidth={2.5}
          />

          <span>Back to Cart</span>
        </button>

        {/* -------------------------------------------------------
            PAGE TITLE
        ------------------------------------------------------- */}

        <div className="mb-6 sm:mb-8">
          <h1
            className="
              text-3xl
              font-extrabold
              tracking-tight
              text-brand-black
              sm:text-4xl
            "
          >
            Checkout
          </h1>

          <p className="mt-1.5 text-sm text-brand-brown/50 sm:hidden">
            Review your address and order before payment.
          </p>
        </div>

        {/* -------------------------------------------------------
            MAIN GRID
        ------------------------------------------------------- */}

        <div
          className="
            flex
            flex-col
            gap-7
            lg:flex-row
            lg:items-start
            lg:gap-12
            xl:gap-14
          "
        >

          {/* =====================================================
              LEFT SIDE
          ===================================================== */}

          <div className="flex w-full flex-col gap-7 lg:w-2/3 lg:gap-8">

            {/* ---------------------------------------------------
                DELIVERY ADDRESS
            --------------------------------------------------- */}

            <section>
              <h2
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  text-base
                  font-extrabold
                  text-brand-black
                  sm:mb-4
                  sm:text-lg
                "
              >
                <MapPin
                  size={18}
                  className="shrink-0 text-brand-orange"
                />

                Delivery Address
              </h2>

              {loadingAddresses ? (
                <div
                  className="
                    flex
                    min-h-24
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    border
                    border-brand-brown/10
                    bg-white
                    text-sm
                    text-brand-brown/50
                  "
                >
                  <Loader2
                    className="animate-spin"
                    size={20}
                  />

                  Loading addresses…
                </div>
              ) : addresses.length === 0 ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    border-brand-brown/20
                    bg-gray-50
                    p-5
                    text-center
                    sm:p-6
                  "
                >
                  <p className="mb-4 text-sm font-medium leading-relaxed text-brand-brown/70">
                    You don't have a saved address yet.
                  </p>

                  <button
                    onClick={() =>
                      setAddressForm({
                        ...EMPTY_ADDRESS_FORM,
                      })
                    }
                    className="
                      inline-flex
                      min-h-11
                      items-center
                      justify-center
                      rounded-xl
                      bg-brand-orange
                      px-5
                      py-3
                      text-sm
                      font-bold
                      text-white
                      transition-all
                      hover:bg-brand-brown
                    "
                  >
                    <MapPin
                      size={16}
                      className="mr-1.5"
                    />

                    Add Delivery Address
                  </button>
                </div>
              ) : (
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                    sm:gap-4
                  "
                >
                  {addresses.map((addr) => {
                    const isSelected =
                      selectedId === addr.id;

                    return (
                      <button
                        key={addr.id}
                        onClick={() =>
                          setSelectedId(addr.id)
                        }
                        className={`
                          relative
                          w-full
                          rounded-2xl
                          border
                          p-4
                          text-left
                          transition-all
                          duration-200
                          sm:p-5
                          ${
                            isSelected
                              ? "border-brand-orange bg-brand-orange/[0.025] ring-2 ring-brand-orange/20 shadow-sm"
                              : "border-brand-brown/10 bg-white hover:border-brand-brown/30"
                          }
                        `}
                      >
                        {isSelected && (
                          <CheckCircle2
                            size={20}
                            className="
                              absolute
                              right-3
                              top-3
                              text-brand-orange
                              sm:right-4
                              sm:top-4
                            "
                            fill="currentColor"
                            strokeWidth={0}
                          />
                        )}

                        <div className="pr-7">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-bold text-brand-black">
                              {addr.name}
                            </p>

                            <span
                              className="
                                rounded-full
                                bg-brand-brown/5
                                px-1.5
                                py-0.5
                                text-[8px]
                                font-bold
                                uppercase
                                tracking-wider
                                text-brand-brown/40
                              "
                            >
                              {addr.address_type}
                            </span>
                          </div>

                          <p
                            className="
                              text-xs
                              leading-5
                              text-brand-brown/70
                              sm:text-sm
                              sm:leading-relaxed
                            "
                          >
                            {addr.house_flat}

                            {addr.street_area
                              ? `, ${addr.street_area}`
                              : ""}

                            <br />

                            {addr.city}, {addr.state} -{" "}
                            {addr.pincode}
                          </p>

                          <p className="mt-2 text-[11px] font-semibold text-brand-brown/50 sm:text-xs">
                            {addr.phone_number}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* ADD NEW ADDRESS */}

                  <button
                    onClick={() =>
                      setAddressForm({
                        ...EMPTY_ADDRESS_FORM,
                      })
                    }
                    className="
                      flex
                      min-h-[105px]
                      w-full
                      flex-col
                      items-center
                      justify-center
                      gap-1.5
                      rounded-2xl
                      border-2
                      border-dashed
                      border-brand-brown/20
                      p-5
                      text-brand-brown/50
                      transition-colors
                      hover:border-brand-orange/50
                      hover:text-brand-orange
                    "
                  >
                    <Plus
                      size={20}
                      strokeWidth={2.5}
                    />

                    <span className="text-sm font-bold">
                      Add New Address
                    </span>
                  </button>
                </div>
              )}
            </section>

            {/* ---------------------------------------------------
                ORDER ITEMS
            --------------------------------------------------- */}

            <section>
              <h2
                className="
                  mb-3
                  text-base
                  font-extrabold
                  text-brand-black
                  sm:mb-4
                  sm:text-lg
                "
              >
                Order Items
              </h2>

              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-brand-brown/10
                  bg-white
                "
              >
                {cart.map((item) => {
                  const p = item.product;

                  const imgSrc =
                    p?.images?.find(
                      (img) => img.is_primary
                    )?.url ??
                    p?.images?.[0]?.url ??
                    null;

                  const itemPrice = parseFloat(
                    String(item.price_at_add ?? 0)
                  );

                  return (
                    <div
                      key={item.id}
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                        border-b
                        border-brand-brown/5
                        p-3.5
                        last:border-b-0
                        sm:gap-4
                        sm:p-4
                      "
                    >
                      {/* PRODUCT IMAGE */}

                      <div
                        className="
                          h-14
                          w-14
                          shrink-0
                          overflow-hidden
                          rounded-xl
                          border
                          border-brand-brown/10
                          bg-brand-cream/30
                          sm:h-16
                          sm:w-16
                        "
                      >
                        {imgSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc}
                            alt={
                              p?.name ??
                              "product"
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              flex
                              h-full
                              w-full
                              items-center
                              justify-center
                              text-brand-brown/30
                            "
                          >
                            <Package size={18} />
                          </div>
                        )}
                      </div>

                      {/* PRODUCT INFO */}

                      <div className="min-w-0 flex-1">
                        <p
                          className="
                            truncate
                            text-xs
                            font-bold
                            text-brand-black
                            sm:text-sm
                          "
                        >
                          {p?.name}
                        </p>

                        <p className="mt-0.5 text-[11px] text-brand-brown/50 sm:text-xs">
                          Qty {item.quantity}
                        </p>
                      </div>

                      {/* PRICE */}

                      <p
                        className="
                          shrink-0
                          text-xs
                          font-extrabold
                          text-brand-black
                          sm:text-sm
                        "
                      >
                        ₹
                        {(
                          itemPrice *
                          item.quantity
                        ).toFixed(0)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* =====================================================
              ORDER SUMMARY
          ===================================================== */}

          <div className="w-full lg:w-1/3">
            <div
              className="
                rounded-2xl
                border
                border-brand-brown/10
                bg-brand-cream/20
                p-4
                shadow-sm
                sm:rounded-3xl
                sm:p-6
                md:p-7
                lg:sticky
                lg:top-28
              "
            >
              <h2
                className="
                  mb-5
                  text-lg
                  font-extrabold
                  text-brand-black
                  sm:text-xl
                "
              >
                Order Summary
              </h2>

              {/* -------------------------------------------------
                  COUPON
              ------------------------------------------------- */}

              <div className="mb-5 sm:mb-6">
                {appliedCoupon ? (
                  <div
                    className="
                      flex
                      min-h-11
                      items-center
                      justify-between
                      gap-2
                      rounded-xl
                      border
                      border-brand-green/20
                      bg-brand-green/10
                      px-3.5
                      py-2.5
                    "
                  >
                    <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-brand-green sm:text-sm">
                      <Tag
                        size={15}
                        className="shrink-0"
                      />

                      <span className="truncate">
                        {appliedCoupon.code} applied
                      </span>
                    </div>

                    <button
                      onClick={handleRemoveCoupon}
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        text-brand-brown/50
                        transition-colors
                        hover:bg-white/60
                        hover:text-red-600
                      "
                      title="Remove coupon"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleApplyCoupon();
                      }}
                      className="
                        flex
                        w-full
                        gap-2
                      "
                    >
                      <input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(
                            e.target.value.toUpperCase()
                          );

                          if (couponError) {
                            setCouponError(null);
                          }
                        }}
                        placeholder="Coupon code"
                        disabled={applyingCoupon}
                        className={`
                          min-w-0
                          flex-1
                          rounded-xl
                          border
                          bg-white
                          px-3
                          py-3
                          text-xs
                          font-semibold
                          text-brand-black
                          placeholder:font-medium
                          placeholder:text-brand-brown/35
                          focus:outline-none
                          focus:ring-2
                          disabled:opacity-60
                          sm:px-3.5
                          sm:text-sm
                          ${
                            couponError
                              ? "border-red-300 focus:border-red-300 focus:ring-red-200"
                              : "border-brand-brown/15 focus:border-brand-orange/40 focus:ring-brand-orange/20"
                          }
                        `}
                      />

                      <button
                        type="submit"
                        disabled={
                          applyingCoupon ||
                          !couponInput.trim()
                        }
                        className="
                          flex
                          min-w-[72px]
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-brand-black
                          px-3
                          py-3
                          text-xs
                          font-bold
                          text-white
                          transition-colors
                          hover:bg-brand-brown
                          disabled:opacity-50
                          sm:min-w-[80px]
                          sm:px-4
                          sm:text-sm
                        "
                      >
                        {applyingCoupon ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </form>

                    {couponError && (
                      <p
                        className="
                          flex
                          items-start
                          gap-2
                          rounded-lg
                          border
                          border-red-100
                          bg-red-50
                          px-3
                          py-2.5
                          text-[11px]
                          font-semibold
                          leading-4
                          text-red-600
                        "
                      >
                        <AlertCircle
                          size={14}
                          className="mt-0.5 shrink-0"
                        />

                        <span>{couponError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* -------------------------------------------------
                  PRICE BREAKDOWN
              ------------------------------------------------- */}

              <div
                className="
                  mb-5
                  flex
                  flex-col
                  gap-3
                  text-xs
                  font-medium
                  text-brand-brown/80
                  sm:mb-6
                  sm:gap-4
                  sm:text-sm
                "
              >
                <div className="flex items-center justify-between gap-4">
                  <span>Subtotal</span>

                  <span className="font-bold text-brand-black">
                    ₹{subtotal.toFixed(0)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Tax (GST 18%)</span>

                  <span className="font-bold text-brand-black">
                    ₹{tax.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Shipping estimate</span>

                  {shipping === 0 ? (
                    <span
                      className="
                        rounded-md
                        border
                        border-brand-green/20
                        bg-brand-green/10
                        px-2
                        py-1
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-widest
                        text-brand-green
                      "
                    >
                      Free
                    </span>
                  ) : (
                    <span className="font-bold text-brand-black">
                      ₹{shipping}
                    </span>
                  )}
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <span>Coupon discount</span>

                    <span className="font-bold text-brand-green">
                      -₹{discount.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>

              <hr className="mb-5 border-brand-brown/10 sm:mb-6" />

              {/* TOTAL */}

              <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
                <span className="text-sm font-bold text-brand-black">
                  Total
                </span>

                <span
                  className="
                    text-2xl
                    font-extrabold
                    text-brand-black
                    sm:text-3xl
                  "
                >
                  ₹{total.toFixed(0)}
                </span>
              </div>

              {/* ERROR */}

              {error && (
                <p
                  className="
                    mb-4
                    rounded-lg
                    border
                    border-red-100
                    bg-red-50
                    p-3
                    text-xs
                    font-semibold
                    leading-4
                    text-red-500
                  "
                >
                  {error}
                </p>
              )}

              {/* DESKTOP PAY BUTTON */}

              <button
                onClick={handlePlaceOrder}
                disabled={
                  placing ||
                  loadingAddresses ||
                  addresses.length === 0
                }
                className="
                  hidden
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-brand-black
                  py-4
                  text-sm
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-brand-brown
                  hover:shadow-xl
                  disabled:opacity-50
                  disabled:hover:translate-y-0
                  lg:flex
                "
              >
                {placing ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    Processing…
                  </>
                ) : (
                  <>Pay ₹{total.toFixed(0)}</>
                )}
              </button>

              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-brand-brown/50
                  sm:mt-6
                  sm:text-[11px]
                "
              >
                <ShieldCheck size={14} />

                Secured by Razorpay
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MOBILE STICKY PAYMENT BAR
      ========================================================= */}

      <div
        className="
          fixed
          inset-x-0
          bottom-0
          z-40
          border-t
          border-brand-brown/10
          bg-white/95
          px-4
          pt-2.5
          shadow-[0_-5px_20px_rgba(0,0,0,0.08)]
          backdrop-blur-md
          lg:hidden
          sm:px-5
          sm:pt-3
          pb-[calc(0.65rem+env(safe-area-inset-bottom))]
        "
      >
        <div
          className="
            mx-auto
            flex
            w-full
            max-w-6xl
            items-center
            gap-3
          "
        >
          {/* MOBILE TOTAL */}

          <div className="min-w-0 shrink-0">
            <span
              className="
                block
                text-[9px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-brand-brown/50
                sm:text-[10px]
              "
            >
              Total
            </span>

            <span
              className="
                block
                text-lg
                font-extrabold
                leading-tight
                text-brand-black
                sm:text-xl
              "
            >
              ₹{total.toFixed(0)}
            </span>
          </div>

          {/* MOBILE PAY */}

          <button
            onClick={handlePlaceOrder}
            disabled={
              placing ||
              loadingAddresses ||
              addresses.length === 0
            }
            className="
              flex
              h-12
              min-w-0
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-brand-black
              px-4
              text-sm
              font-bold
              text-white
              shadow-md
              transition-all
              hover:bg-brand-brown
              disabled:opacity-50
              sm:h-13
              sm:px-6
            "
          >
            {placing ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                <span>Processing…</span>
              </>
            ) : (
              <span>
                Pay ₹{total.toFixed(0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================
          ADD ADDRESS MODAL
      ========================================================= */}

      {addressForm && (
        <div
          className="
            fixed
            inset-0
            z-[70]
            flex
            items-end
            justify-center
            sm:items-center
            sm:p-4
          "
        >
          {/* BACKDROP */}

          <div
            className="
              absolute
              inset-0
              bg-brand-black/40
              backdrop-blur-sm
            "
            onClick={() => setAddressForm(null)}
          />

          {/* MODAL */}

          <div
            className="
              relative
              flex
              h-[100dvh]
              w-full
              flex-col
              overflow-hidden
              bg-white
              sm:h-auto
              sm:max-h-[88vh]
              sm:max-w-xl
              sm:rounded-2xl
            "
          >
            {/* MODAL HEADER */}

            <div
              className="
                flex
                shrink-0
                items-center
                justify-between
                gap-3
                border-b
                border-brand-brown/10
                px-4
                py-3
                sm:px-6
                sm:py-3.5
              "
            >
              <button
                type="button"
                onClick={() => {
                  setAddressForm(null);
                  router.push("/cart");
                }}
                className="
                  flex
                  min-h-9
                  items-center
                  gap-1.5
                  rounded-lg
                  text-xs
                  font-bold
                  text-brand-brown/60
                  transition-colors
                  hover:text-brand-orange
                "
              >
                <ArrowLeft
                  size={14}
                  strokeWidth={2.5}
                />

                Back to Cart
              </button>

              <button
                type="button"
                onClick={() =>
                  setAddressForm(null)
                }
                aria-label="Close"
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  text-brand-brown/50
                  transition-colors
                  hover:bg-gray-100
                  hover:text-brand-black
                "
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM */}

            <div
              className="
                flex-1
                overflow-y-auto
                overscroll-contain
                p-4
                sm:p-6
              "
            >
              <AddressForm
                form={addressForm}
                setForm={setAddressForm}
                onSubmit={handleSaveNewAddress}
                onCancel={() =>
                  setAddressForm(null)
                }
                saving={savingAddress}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutContent />
    </AuthGuard>
  );
}