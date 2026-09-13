"use client";
// src/app/products/page.tsx
// Dedicated shop page: every product's variants shown as separate cards
// (e.g. "Cashews W240 — 250g" and "Cashews W240 — 1kg" as two distinct
// cards), with a filter bar (price, cashew grade, minimum rating) and sort.
// Clicking a card still goes to the normal product detail page with that
// exact variant pre-selected.
//
// Filters used to live in a fixed 240px sidebar next to the grid, which
// wasted the whole left column's width on large screens (240px + gap of
// dead space beside 4-5 rows of empty air below the filter panel). They're
// now a single horizontal row of dropdown chips above the grid — same
// filters, same state, but the product grid gets the full page width.
// Mobile keeps the slide-in drawer (that pattern still makes sense at
// narrow widths where a row of chips would just wrap awkwardly).
import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, ChevronDown, PackageSearch, Star } from "lucide-react";
import * as productService from "@/services/productService";
import VariantProductCard from "@/components/VariantProductCard";
import type { Product, ProductFilterOptions, ProductListParams } from "@/types";

const PAGE_SIZE = 24;

// Fallback bounds for the price slider until /filters loads real min/max.
const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 5000;

const SORT_OPTIONS: { value: NonNullable<ProductListParams["sort"]> | ""; label: string }[] = [
  { value: "", label: "Featured" },
  { value: "price_asc", label: "Low to High" },
  { value: "price_desc", label: "High to Low" },
  { value: "rating_desc", label: "Top Rated" },
];

interface Filters {
  grades: string[];
  minPrice: string;
  maxPrice: string;
  minRating: number | null;
  sort: ProductListParams["sort"] | "";
  categoryId: string;
}

const EMPTY_FILTERS: Filters = { grades: [], minPrice: "", maxPrice: "", minRating: null, sort: "", categoryId: "" };

type DropdownKey = "price" | "grade" | "rating";

function ProductsShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterOptions, setFilterOptions] = useState<ProductFilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // Display name for the category filter (from ?category=, set by the
  // category tiles on the homepage) — kept separate from `filters` since
  // it's just a label, not something the backend needs back.
  const [categoryName, setCategoryName] = useState("");
  const [priceDraft, setPriceDraft] = useState({ min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE });
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const priceMin = filterOptions?.min_price != null ? Math.floor(filterOptions.min_price) : DEFAULT_MIN_PRICE;
  const priceMax = filterOptions?.max_price != null ? Math.ceil(filterOptions.max_price) : DEFAULT_MAX_PRICE;
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Which desktop filter-chip dropdown is open (only one at a time).
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Seed filters from the URL once on mount, so a shared/back-navigated
  // link reproduces the same filtered view instead of always resetting to
  // "no filters".
  useEffect(() => {
    const gradeParam = searchParams.getAll("grade");
    const minPrice = searchParams.get("min_price") ?? "";
    const maxPrice = searchParams.get("max_price") ?? "";
    const minRating = searchParams.get("min_rating");
    const sort = (searchParams.get("sort") as Filters["sort"]) ?? "";
    const categoryId = searchParams.get("category_id") ?? "";
    const category = searchParams.get("category") ?? "";
    const pageParam = Number(searchParams.get("page") ?? "1");
    setFilters({
      grades: gradeParam,
      minPrice,
      maxPrice,
      minRating: minRating ? Number(minRating) : null,
      sort,
      categoryId,
    });
    setCategoryName(category);
    setPriceDraft({
      min: minPrice ? Number(minPrice) : DEFAULT_MIN_PRICE,
      max: maxPrice ? Number(maxPrice) : DEFAULT_MAX_PRICE,
    });
    setPage(pageParam > 0 ? pageParam : 1);
    // Only on mount — filter changes after this are driven by user
    // interaction, not by re-reading the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    productService.getProductFilters().then(setFilterOptions).catch(() => {});
  }, []);

  // Once the real min/max load, snap the slider bounds to them (unless the
  // person already picked specific values from the URL).
  useEffect(() => {
    if (!filterOptions) return;
    const min = filterOptions.min_price != null ? Math.floor(filterOptions.min_price) : DEFAULT_MIN_PRICE;
    const max = filterOptions.max_price != null ? Math.ceil(filterOptions.max_price) : DEFAULT_MAX_PRICE;
    setPriceDraft({
      min: filters.minPrice ? Number(filters.minPrice) : min,
      max: filters.maxPrice ? Number(filters.maxPrice) : max,
    });
    // Only re-run when filterOptions arrives — not on every filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions]);

  // Keep the URL in sync so filters survive a refresh/share/back-navigation,
  // without triggering a full page reload.
  const syncUrl = useCallback(
    (f: Filters, p: number) => {
      const params = new URLSearchParams();
      f.grades.forEach((g) => params.append("grade", g));
      if (f.minPrice) params.set("min_price", f.minPrice);
      if (f.maxPrice) params.set("max_price", f.maxPrice);
      if (f.minRating) params.set("min_rating", String(f.minRating));
      if (f.sort) params.set("sort", f.sort);
      if (f.categoryId) {
        params.set("category_id", f.categoryId);
        if (categoryName) params.set("category", categoryName);
      }
      if (p > 1) params.set("page", String(p));
      router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    },
    [router, categoryName]
  );

  const loadProducts = useCallback((f: Filters, p: number) => {
    setLoading(true);
    setError("");
    productService
      .listProducts({
        category_id: f.categoryId || undefined,
        grade: f.grades.length ? f.grades : undefined,
        min_price: f.minPrice ? Number(f.minPrice) : undefined,
        max_price: f.maxPrice ? Number(f.maxPrice) : undefined,
        min_rating: f.minRating ?? undefined,
        sort: f.sort || undefined,
        page: p,
        page_size: PAGE_SIZE,
      })
      .then((res) => {
        setProducts(res.items);
        setTotal(res.total);
      })
      .catch(() => setError("Couldn't load products. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts(filters, page);
    syncUrl(filters, page);
    // syncUrl intentionally excluded — it's stable via useCallback and
    // re-running it isn't what should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, loadProducts]);

  // Close whichever desktop dropdown is open on an outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateFilters = (patch: Partial<Filters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const toggleGrade = (grade: string) => {
    setFilters((f) => {
      const grades = f.grades.includes(grade) ? f.grades.filter((g) => g !== grade) : [...f.grades, grade];
      return { ...f, grades };
    });
    setPage(1);
  };

  const applyPriceDraft = () => {
    updateFilters({
      minPrice: priceDraft.min > priceMin ? String(priceDraft.min) : "",
      maxPrice: priceDraft.max < priceMax ? String(priceDraft.max) : "",
    });
    setOpenDropdown(null);
  };

  const clearAll = () => {
    setPriceDraft({ min: priceMin, max: priceMax });
    setFilters(EMPTY_FILTERS);
    setCategoryName("");
    setPage(1);
    setOpenDropdown(null);
  };

  const clearCategory = () => {
    setCategoryName("");
    updateFilters({ categoryId: "" });
  };

  const activeFilterCount =
    filters.grades.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.categoryId ? 1 : 0);

  // Flatten each product's active variants into individual cards. Also
  // re-applies the price range at the variant level (the backend only
  // guarantees the PRODUCT has *a* matching variant) so a card never shows
  // a price outside what the person actually filtered for.
  const cards = useMemo(() => {
    const min = filters.minPrice ? Number(filters.minPrice) : null;
    const max = filters.maxPrice ? Number(filters.maxPrice) : null;
    const out: { product: Product; variantId: string }[] = [];
    for (const product of products) {
      const variants = [...product.variants].sort((a, b) => a.weight_grams - b.weight_grams);
      for (const variant of variants) {
        if (!variant.is_active) continue;
        const effectivePrice = parseFloat(variant.discounted_price ?? variant.price ?? "0");
        if (min !== null && effectivePrice < min) continue;
        if (max !== null && effectivePrice > max) continue;
        out.push({ product, variantId: variant.id });
      }
    }
    return out;
  }, [products, filters.minPrice, filters.maxPrice]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Individual filter sections, reused by both the desktop dropdowns
  // and the mobile drawer's single stacked panel. ─────────────────────────
  const priceSection = (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-brand-brown/60 mb-3">Price</h3>
      <div className="flex items-center justify-between text-sm font-bold text-brand-black mb-3">
        <span>₹{priceDraft.min}</span>
        <span>₹{priceDraft.max}</span>
      </div>
      <div className="relative h-5 flex items-center mb-3">
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-brand-brown/10" />
        <div
          className="absolute h-1.5 rounded-full bg-brand-orange"
          style={{
            left: `${((priceDraft.min - priceMin) / Math.max(priceMax - priceMin, 1)) * 100}%`,
            right: `${100 - ((priceDraft.max - priceMin) / Math.max(priceMax - priceMin, 1)) * 100}%`,
          }}
        />
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          value={priceDraft.min}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), priceDraft.max - 1);
            setPriceDraft((d) => ({ ...d, min: v }));
          }}
          aria-label="Minimum price"
          className="range-slider absolute left-0 right-0 w-full h-5"
        />
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          value={priceDraft.max}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), priceDraft.min + 1);
            setPriceDraft((d) => ({ ...d, max: v }));
          }}
          aria-label="Maximum price"
          className="range-slider absolute left-0 right-0 w-full h-5"
        />
      </div>
      <button
        onClick={applyPriceDraft}
        className="w-full text-xs font-bold text-center bg-brand-brown/5 hover:bg-brand-orange/10 hover:text-brand-orange text-brand-brown/70 rounded-lg py-2 transition-colors"
      >
        Apply
      </button>
    </div>
  );

  const gradeSection =
    filterOptions && filterOptions.grades.length > 0 ? (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-brand-brown/60 mb-3">Cashew Grade</h3>
        <div className="flex flex-col gap-2">
          {filterOptions.grades.map((grade) => (
            <label key={grade} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.grades.includes(grade)}
                onChange={() => toggleGrade(grade)}
                className="w-4 h-4 rounded border-brand-brown/30 text-brand-orange focus:ring-brand-orange/40"
              />
              <span className="text-sm text-brand-brown/80 group-hover:text-brand-black transition-colors">{grade}</span>
            </label>
          ))}
        </div>
      </div>
    ) : null;

  // One row of 5 stars. Clicking the Nth star sets "N & up" and fills
  // stars 1..N; clicking the already-selected star clears it back to "any
  // rating".
  const ratingSection = (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-brand-brown/60 mb-3">Minimum Rating</h3>
      <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (hoverRating ?? filters.minRating ?? 0) >= star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => {
                updateFilters({ minRating: filters.minRating === star ? null : star });
                setOpenDropdown(null);
              }}
              onMouseEnter={() => setHoverRating(star)}
              className="p-0.5 -m-0.5"
              aria-label={`${star} star${star > 1 ? "s" : ""} & up`}
            >
              <Star
                size={22}
                className={filled ? "text-brand-orange fill-brand-orange transition-colors" : "text-brand-brown/25 transition-colors"}
              />
            </button>
          );
        })}
        {filters.minRating !== null && (
          <span className="ml-2 text-xs font-semibold text-brand-brown/60">{filters.minRating}★ &amp; up</span>
        )}
      </div>
    </div>
  );

  // Stacked version for the mobile drawer (all three sections at once).
  const filterPanel = (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide text-brand-black">Filters</h2>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-xs font-bold text-brand-orange hover:underline">
            Clear all
          </button>
        )}
      </div>
      {priceSection}
      {gradeSection}
      {ratingSection}
    </div>
  );

  // One chip button + its dropdown panel, used for Price/Grade/Rating on
  // desktop. `active` bolds the chip when that filter has a value set.
  const filterChip = (key: DropdownKey, label: string, active: boolean, content: React.ReactNode) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenDropdown((k) => (k === key ? null : key))}
        className={`flex items-center gap-1.5 text-sm font-semibold rounded-xl px-3.5 py-2.5 border transition-colors ${
          active
            ? "bg-brand-orange/10 border-brand-orange/40 text-brand-orange"
            : "bg-white border-brand-brown/15 text-brand-black hover:border-brand-brown/30"
        }`}
      >
        {label}
        <ChevronDown size={14} className={`transition-transform ${openDropdown === key ? "rotate-180" : ""}`} />
      </button>
      {openDropdown === key && (
        <div className="absolute left-0 top-full mt-2 z-20 w-72 bg-white rounded-2xl border border-brand-brown/10 shadow-xl p-4">
          {content}
        </div>
      )}
    </div>
  );

  const priceLabel =
    filters.minPrice || filters.maxPrice ? `₹${priceDraft.min} – ₹${priceDraft.max}` : "Price";
  const gradeLabel = filters.grades.length > 0 ? `Grade (${filters.grades.length})` : "Grade";
  const ratingLabel = filters.minRating ? `${filters.minRating}★ & up` : "Rating";

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 pt-20 sm:pt-24 min-h-screen">
      <div className="mb-4 sm:mb-8 flex flex-col gap-1">
        <span className="text-brand-orange text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">Shop All</span>
        <h1 className="text-xl sm:text-3xl font-black text-brand-black uppercase leading-tight">
          {filters.categoryId && categoryName ? categoryName : "Our Cashews"}
        </h1>
      </div>

      {/* Single top filter row — filters used to sit in a 240px sidebar
          beside the grid; that's gone now, so the grid below uses the
          full page width on every screen size. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
        {/* Mobile: opens the slide-in drawer */}
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-brand-black bg-white border border-brand-brown/15 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5"
        >
          <SlidersHorizontal size={14} className="sm:hidden" />
          <SlidersHorizontal size={15} className="hidden sm:block" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-brand-orange text-white text-[9px] sm:text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Category filter, when arriving from a category tile — shown as a
            removable badge rather than another dropdown, since it's a
            single value set by navigation, not something picked here. */}
        {filters.categoryId && (
          <span className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-3.5 py-2.5 bg-brand-orange/10 border border-brand-orange/40 text-brand-orange">
            {categoryName || "Category"}
            <button onClick={clearCategory} aria-label="Clear category filter" className="hover:text-brand-black">
              <X size={14} />
            </button>
          </span>
        )}

        {/* Desktop: filter chips inline, in the same row as sort/count */}
        <div ref={filterBarRef} className="hidden lg:flex items-center gap-2.5">
          {filterChip("price", priceLabel, !!(filters.minPrice || filters.maxPrice), priceSection)}
          {gradeSection && filterChip("grade", gradeLabel, filters.grades.length > 0, gradeSection)}
          {filterChip("rating", ratingLabel, filters.minRating !== null, ratingSection)}
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs font-bold text-brand-orange hover:underline ml-1">
              Clear all
            </button>
          )}
        </div>

        <p className="hidden sm:block text-sm text-brand-brown/50 font-medium lg:ml-2">
          {loading ? "Loading…" : `${cards.length} of ${total} product${total === 1 ? "" : "s"}`}
        </p>

        <select
          value={filters.sort}
          onChange={(e) => updateFilters({ sort: e.target.value as Filters["sort"] })}
          className="ml-auto min-w-0 max-w-[128px] sm:max-w-none text-xs sm:text-sm font-semibold text-brand-black bg-white border border-brand-brown/15 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="text-center py-16 text-brand-brown/60 text-sm">{error}</div>}

      {!error && loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square skeleton rounded-xl sm:rounded-2xl mb-2 sm:mb-3" />
              <div className="w-4/5 h-3 sm:h-3.5 skeleton-light rounded-md mb-1.5 sm:mb-2" />
              <div className="w-1/2 h-3.5 sm:h-4 skeleton-light rounded-md" />
            </div>
          ))}
        </div>
      )}

      {!error && !loading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-brand-brown/10 rounded-3xl bg-gray-50">
          <PackageSearch size={32} className="text-brand-brown/20 mb-3" />
          <p className="text-brand-black font-bold mb-1">No products match these filters</p>
          <p className="text-sm text-brand-brown/50 mb-4">Try widening your price range or clearing a filter.</p>
          <button onClick={clearAll} className="text-sm font-bold text-brand-orange hover:underline">
            Clear all filters
          </button>
        </div>
      )}

      {!error && !loading && cards.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {cards.map(({ product, variantId }) => {
              const variant = product.variants.find((v) => v.id === variantId);
              if (!variant) return null;
              return <VariantProductCard key={variantId} product={product} variant={variant} />;
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-brown/15 text-brand-brown/60 hover:text-brand-orange hover:border-brand-orange/40 disabled:opacity-30 disabled:hover:text-brand-brown/60 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-brand-brown/70 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-brown/15 text-brand-brown/60 hover:text-brand-orange hover:border-brand-orange/40 disabled:opacity-30 disabled:hover:text-brand-brown/60 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-brown/10 sticky top-0 bg-white z-10">
              <h2 className="text-sm font-black uppercase tracking-wide text-brand-black">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">{filterPanel}</div>
            <div className="p-5 pt-0 sticky bottom-0 bg-white">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-brand-black hover:bg-brand-brown text-white font-bold rounded-xl py-3 transition-colors"
              >
                Show {total} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams() opts the whole tree into client-side rendering during
// prerender unless it sits below a Suspense boundary — without this,
// `next build` fails the static export step for this route entirely
// ("should be wrapped in a suspense boundary") rather than just warning.
// The fallback mirrors the real loading skeleton's dimensions so there's no
// layout jump once ProductsShopPageInner mounts and takes over.
export default function ProductsShopPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 pt-20 sm:pt-24 min-h-screen">
          <div className="mb-4 sm:mb-8 flex flex-col gap-1">
            <span className="text-brand-orange text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">Shop All</span>
            <h1 className="text-xl sm:text-3xl font-black text-brand-black uppercase leading-tight">Our Cashews</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square skeleton rounded-xl sm:rounded-2xl mb-2 sm:mb-3" />
                <div className="w-4/5 h-3 sm:h-3.5 skeleton-light rounded-md mb-1.5 sm:mb-2" />
                <div className="w-1/2 h-3.5 sm:h-4 skeleton-light rounded-md" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsShopPageInner />
    </Suspense>
  );
}
