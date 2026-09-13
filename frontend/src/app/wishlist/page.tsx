"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  ArrowRight,
  Trash2,
  Package,
} from "lucide-react";

import * as wishlistService from "@/services/wishlistService";
import { useCart } from "@/contexts/CartContext";
import AuthGuard from "@/components/AuthGuard";
import { assetUrl } from "@/config/env";
import type { WishlistItem } from "@/types";

function WishlistContent() {
  const router = useRouter();
  const { addToCart, cartItems } = useCart();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<
    Record<string, boolean>
  >({});

  const loadWishlist = useCallback(async () => {
    setLoading(true);

    try {
      const res = await wishlistService.getWishlist();
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (productId: string) => {
    if (busyId === productId) return;

    setBusyId(productId);

    const prevItems = items;

    setItems((prev) =>
      prev.filter((i) => i.product?.id !== productId)
    );

    try {
      await wishlistService.removeFromWishlist(productId);
    } catch (e) {
      console.error(e);
      setItems(prevItems);
    } finally {
      setBusyId(null);
    }
  };

  const handleAddToCart = async (
    item: WishlistItem
  ) => {
    const variant =
      item.product?.variants?.find(
        (v) => v.is_active
      ) ??
      item.product?.variants?.[0];

    if (!variant || addingId === variant.id) return;

    setAddingId(variant.id);

    try {
      await addToCart(variant.id, 1);
    } finally {
      setAddingId(null);
    }
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <main
        className="
          min-h-screen
          w-full
          px-3.5
          pt-24
          pb-10
          sm:px-5
          sm:pt-28
          sm:pb-14
          md:px-6
          md:pt-32
          lg:px-8
        "
      >
        <div className="mx-auto w-full max-w-7xl">

          {/* Header Skeleton */}

          <div
            className="
              mb-6
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-brand-brown/10
              pb-5
              sm:mb-8
              sm:pb-6
            "
          >
            <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200 sm:h-9 sm:w-40" />

            <div className="h-7 w-16 animate-pulse rounded-full bg-gray-100 sm:w-20" />
          </div>

          {/* Skeleton Grid */}

          <div
            className="
              grid
              grid-cols-2
              gap-2.5
              sm:grid-cols-2
              sm:gap-4
              md:grid-cols-3
              lg:grid-cols-4
              lg:gap-5
              xl:gap-6
            "
          >
            {Array.from({ length: 8 }).map(
              (_, i) => (
                <div
                  key={i}
                  className="
                    flex
                    min-w-0
                    animate-pulse
                    flex-col
                    overflow-hidden
                    rounded-xl
                    border
                    border-brand-brown/5
                    bg-white
                    shadow-sm
                    sm:rounded-2xl
                  "
                >
                  <div
                    className="
                      aspect-square
                      w-full
                      bg-brand-orange/10
                    "
                  />

                  <div
                    className="
                      flex
                      flex-1
                      flex-col
                      gap-2
                      p-2.5
                      sm:gap-3
                      sm:p-4
                    "
                  >
                    <div className="h-2.5 w-1/3 rounded bg-gray-100" />

                    <div className="h-4 w-full rounded bg-gray-200" />

                    <div className="h-4 w-4/5 rounded bg-gray-200" />

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
                      <div className="h-5 w-1/3 rounded bg-gray-200" />

                      <div className="h-8 w-20 rounded-lg bg-gray-100" />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     EMPTY WISHLIST
  ============================================================ */

  if (!items.length) {
    return (
      <main
        className="
          flex
          min-h-[70vh]
          w-full
          flex-col
          items-center
          justify-center
          px-5
          pt-20
          text-center
        "
      >
        <div
          className="
            mb-5
            flex
            h-20
            w-20
            items-center
            justify-center
            rounded-full
            bg-brand-orange/10
            text-brand-orange
            shadow-sm
            sm:mb-6
            sm:h-24
            sm:w-24
          "
        >
          <Heart
            size={34}
            strokeWidth={2}
            className="sm:h-10 sm:w-10"
          />
        </div>

        <h2
          className="
            mb-2.5
            text-2xl
            font-extrabold
            tracking-tight
            text-brand-black
            sm:mb-3
            sm:text-3xl
            md:text-4xl
          "
        >
          Your wishlist is empty
        </h2>

        <p
          className="
            mb-7
            max-w-sm
            text-sm
            leading-relaxed
            text-brand-brown/60
            sm:mb-8
            sm:text-base
          "
        >
          Save products you love and find them here later.
        </p>

        <button
          onClick={() => router.push("/")}
          className="
            inline-flex
            min-h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-brand-orange
            px-6
            py-3
            text-sm
            font-bold
            text-white
            shadow-md
            transition-all
            duration-300
            active:scale-[0.98]
            hover:bg-brand-brown
            hover:shadow-xl
            sm:px-8
            sm:py-3.5
          "
        >
          Start Shopping

          <ArrowRight
            size={17}
            strokeWidth={2.5}
          />
        </button>
      </main>
    );
  }

  /* ============================================================
     MAIN WISHLIST
  ============================================================ */

  return (
    <main
      className="
        min-h-screen
        w-full
        px-3.5
        pt-24
        pb-10
        sm:px-5
        sm:pt-28
        sm:pb-14
        md:px-6
        md:pt-32
        lg:px-8
      "
    >
      <div className="mx-auto w-full max-w-7xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div
          className="
            mb-6
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-brand-brown/10
            pb-5
            sm:mb-8
            sm:items-baseline
            sm:justify-start
            sm:pb-6
            sm:gap-4
          "
        >
          <h1
            className="
              text-2xl
              font-extrabold
              tracking-tight
              text-brand-black
              sm:text-3xl
              md:text-4xl
            "
          >
            Wishlist
          </h1>

          <span
            className="
              shrink-0
              rounded-full
              border
              border-brand-brown/5
              bg-gray-100
              px-2.5
              py-1
              text-[10px]
              font-bold
              text-brand-brown/60
              sm:px-3
              sm:text-sm
            "
          >
            {items.length}{" "}
            {items.length === 1
              ? "Item"
              : "Items"}
          </span>
        </div>

        {/* ======================================================
            PRODUCT GRID
        ====================================================== */}

        <div
          className="
            grid
            grid-cols-2
            gap-2.5
            sm:grid-cols-2
            sm:gap-4
            md:grid-cols-3
            lg:grid-cols-4
            lg:gap-5
            xl:gap-6
          "
        >
          {items.map((item) => {
            const { id, product } = item;

            if (!product) return null;

            const primaryImage =
              product.images?.find(
                (i) => i.is_primary
              ) ??
              product.images?.[0];

            const imageUrl = brokenImages[
              product.id
            ]
              ? null
              : assetUrl(primaryImage?.url);

            const variant =
              product.variants?.find(
                (v) => v.is_active
              ) ??
              product.variants?.[0];

            const price = parseFloat(
              String(
                variant?.discounted_price ??
                  variant?.price ??
                  "0"
              )
            );

            const isInCart =
              !!variant &&
              cartItems.some(
                (c) =>
                  c.variant?.id === variant.id
              );

            const isAdding =
              !!variant &&
              addingId === variant.id;

            return (
              <article
                key={id}
                className="
                  group
                  relative
                  flex
                  min-w-0
                  flex-col
                  overflow-hidden
                  rounded-xl
                  border
                  border-brand-brown/5
                  bg-white
                  shadow-sm
                  transition-all
                  duration-300
                  sm:rounded-2xl
                  hover:-translate-y-1
                  hover:shadow-xl
                "
              >
                {/* =================================================
                    IMAGE
                ================================================= */}

                <div
                  className="
                    relative
                    aspect-square
                    w-full
                    cursor-pointer
                    overflow-hidden
                    bg-brand-cream/20
                  "
                  onClick={() =>
                    router.push(
                      `/products/${product.id}`
                    )
                  }
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="
                        h-full
                        w-full
                        object-cover
                        transition-transform
                        duration-700
                        ease-out
                        group-hover:scale-105
                      "
                      onError={() =>
                        setBrokenImages(
                          (prev) => ({
                            ...prev,
                            [product.id]: true,
                          })
                        )
                      }
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        w-full
                        flex-col
                        items-center
                        justify-center
                        gap-1.5
                        bg-gray-50
                        text-brand-brown/30
                      "
                    >
                      <Package
                        size={22}
                        strokeWidth={1.5}
                      />

                      <span className="text-[10px] font-medium sm:text-[11px]">
                        No Image
                      </span>
                    </div>
                  )}

                  {/* REMOVE */}

                  <button
                    className="
                      absolute
                      right-2
                      top-2
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      bg-white/95
                      text-brand-brown/60
                      shadow-sm
                      backdrop-blur-sm
                      transition-all
                      duration-300
                      active:scale-90
                      hover:bg-red-500
                      hover:text-white
                      disabled:opacity-50
                      sm:right-3
                      sm:top-3
                      sm:h-9
                      sm:w-9
                    "
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(product.id);
                    }}
                    disabled={
                      busyId === product.id
                    }
                    aria-label="Remove from wishlist"
                  >
                    <Trash2
                      size={14}
                      className="sm:h-4 sm:w-4"
                    />
                  </button>
                </div>

                {/* =================================================
                    PRODUCT CONTENT
                ================================================= */}

                <div
                  className="
                    flex
                    flex-1
                    flex-col
                    bg-white
                    p-2.5
                    sm:gap-2
                    sm:p-4
                  "
                >
                  {/* CATEGORY */}

                  {product.category?.name && (
                    <span
                      className="
                        mb-0.5
                        truncate
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.12em]
                        text-brand-brown/40
                        sm:text-[10px]
                        sm:tracking-widest
                      "
                    >
                      {product.category.name}
                    </span>
                  )}

                  {/* PRODUCT NAME */}

                  <h3
                    className="
                      line-clamp-2
                      min-h-[2.25rem]
                      cursor-pointer
                      text-xs
                      font-bold
                      leading-[1.35]
                      text-brand-black
                      transition-colors
                      hover:text-brand-orange
                      sm:min-h-[2.6rem]
                      sm:text-[15px]
                      sm:leading-snug
                    "
                    onClick={() =>
                      router.push(
                        `/products/${product.id}`
                      )
                    }
                  >
                    {product.name}
                  </h3>

                  {/* WEIGHT */}

                  {variant && (
                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        font-medium
                        text-brand-black/40
                        sm:text-xs
                      "
                    >
                      {variant.weight_grams}g
                    </p>
                  )}

                  {/* PRICE */}

                  <div className="mt-2 sm:mt-auto">
                    <span
                      className="
                        block
                        text-base
                        font-extrabold
                        tracking-tight
                        text-brand-black
                        sm:text-lg
                      "
                    >
                      ₹{price.toFixed(0)}
                    </span>

                    {/* ADD TO CART */}

                    <button
                      onClick={() =>
                        handleAddToCart(item)
                      }
                      disabled={
                        !variant ||
                        isAdding ||
                        isInCart
                      }
                      className={`
                        mt-2
                        flex
                        min-h-9
                        w-full
                        items-center
                        justify-center
                        rounded-lg
                        px-2
                        py-2
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.06em]
                        transition-all
                        active:scale-[0.98]
                        disabled:opacity-70
                        sm:mt-2.5
                        sm:min-h-10
                        sm:rounded-xl
                        sm:text-[10px]
                        sm:tracking-wider
                        ${
                          isInCart
                            ? "cursor-default bg-brand-green/10 text-brand-green"
                            : "bg-brand-black text-white hover:bg-brand-brown"
                        }
                      `}
                    >
                      {isInCart
                        ? "✓ In Cart"
                        : isAdding
                        ? "Adding…"
                        : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function WishlistPage() {
  return (
    <AuthGuard>
      <WishlistContent />
    </AuthGuard>
  );
}

