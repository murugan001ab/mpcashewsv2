"use client";
// src/app/products/page.tsx
// Dedicated shop page: every product's variants shown as separate cards
// (e.g. "Cashews W240 — 250g" and "Cashews W240 — 1kg" as two distinct
// cards), with a filter sidebar (price, cashew grade, minimum rating) and
// sort. Clicking a card still goes to the normal product detail page with
// that exact variant pre-selected.
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import * as productService from "@/services/productService";
import VariantProductCard from "@/components/VariantProductCard";
import type { Product, ProductFilterOptions, ProductListParams } from "@/types";

const PAGE_SIZE = 24;

const RATING_OPTIONS = [4, 3, 2, 1];

const SORT_OPTIONS: { value: NonNullable<ProductListParams["sort"]> | ""; label: string }[] = [
  { value: "", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating_desc", label: "Highest Rated" },
];

interface Filters {
  grades: string[];
  minPrice: string;
  maxPrice: string;
  minRating: number | null;
  sort: ProductListParams["sort"] | "";
}

const EMPTY_FILTERS: Filters = { grades: [], minPrice: "", maxPrice: "", minRating: null, sort: "" };

function ProductsShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterOptions, setFilterOptions] = useState<ProductFilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [priceDraft, setPriceDraft] = useState({ min: "", max: "" });
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Seed filters from the URL once on mount, so a shared/back-navigated
  // link reproduces the same filtered view instead of always resetting to
  // "no filters".
  useEffect(() => {
    const gradeParam = searchParams.getAll("grade");
    const minPrice = searchParams.get("min_price") ?? "";
    const maxPrice = searchParams.get("max_price") ?? "";
    const minRating = searchParams.get("min_rating");
    const sort = (searchParams.get("sort") as Filters["sort"]) ?? "";
    const pageParam = Number(searchParams.get("page") ?? "1");
    setFilters({
      grades: gradeParam,
      minPrice,
      maxPrice,
      minRating: minRating ? Number(minRating) : null,
      sort,
    });
    setPriceDraft({ min: minPrice, max: maxPrice });
    setPage(pageParam > 0 ? pageParam : 1);
    // Only on mount — filter changes after this are driven by user
    // interaction, not by re-reading the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    productService.getProductFilters().then(setFilterOptions).catch(() => {});
  }, []);

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
      if (p > 1) params.set("page", String(p));
      router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    },
    [router]
  );

  const loadProducts = useCallback((f: Filters, p: number) => {
    setLoading(true);
    setError("");
    productService
      .listProducts({
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
    updateFilters({ minPrice: priceDraft.min, maxPrice: priceDraft.max });
  };

  const clearAll = () => {
    setPriceDraft({ min: "", max: "" });
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const activeFilterCount =
    filters.grades.length + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.minRating ? 1 : 0);

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

      {/* Price range */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-brand-brown/60 mb-3">Price</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder={filterOptions?.min_price ? `₹${Math.floor(filterOptions.min_price)}` : "Min"}
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
            className="w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-brand-brown/15 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
          />
          <span className="text-brand-brown/30">–</span>
          <input
            type="number"
            min={0}
            placeholder={filterOptions?.max_price ? `₹${Math.ceil(filterOptions.max_price)}` : "Max"}
            value={priceDraft.max}
            onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
            className="w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-brand-brown/15 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
          />
        </div>
        <button
          onClick={applyPriceDraft}
          className="mt-2 w-full text-xs font-bold text-center bg-brand-brown/5 hover:bg-brand-orange/10 hover:text-brand-orange text-brand-brown/70 rounded-lg py-2 transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Grade */}
      {filterOptions && filterOptions.grades.length > 0 && (
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
      )}

      {/* Rating */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-brand-brown/60 mb-3">Rating</h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="rating"
              checked={filters.minRating === null}
              onChange={() => updateFilters({ minRating: null })}
              className="w-4 h-4 border-brand-brown/30 text-brand-orange focus:ring-brand-orange/40"
            />
            <span className="text-sm text-brand-brown/80 group-hover:text-brand-black transition-colors">Any rating</span>
          </label>
          {RATING_OPTIONS.map((r) => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={filters.minRating === r}
                onChange={() => updateFilters({ minRating: r })}
                className="w-4 h-4 border-brand-brown/30 text-brand-orange focus:ring-brand-orange/40"
              />
              <span className="text-sm text-brand-brown/80 group-hover:text-brand-black transition-colors">{r}★ &amp; up</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pt-20 sm:pt-24 min-h-screen">
      <div className="mb-6 sm:mb-8 flex flex-col gap-1">
        <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">Shop All</span>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-black uppercase leading-tight">Our Cashews</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-white rounded-2xl border border-brand-brown/10 p-5">{filterPanel}</div>
        </aside>

        {/* Results */}
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 text-sm font-bold text-brand-black bg-white border border-brand-brown/15 rounded-xl px-4 py-2.5"
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <p className="hidden sm:block text-sm text-brand-brown/50 font-medium">
              {loading ? "Loading…" : `${cards.length} of ${total} product${total === 1 ? "" : "s"}`}
            </p>

            <select
              value={filters.sort}
              onChange={(e) => updateFilters({ sort: e.target.value as Filters["sort"] })}
              className="ml-auto text-sm font-semibold text-brand-black bg-white border border-brand-brown/15 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-center py-16 text-brand-brown/60 text-sm">{error}</div>
          )}

          {!error && loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-square skeleton rounded-2xl mb-3" />
                  <div className="w-4/5 h-3.5 skeleton-light rounded-md mb-2" />
                  <div className="w-1/2 h-4 skeleton-light rounded-md" />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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
        </div>
      </div>

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pt-20 sm:pt-24 min-h-screen">
          <div className="mb-6 sm:mb-8 flex flex-col gap-1">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">Shop All</span>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-black uppercase leading-tight">Our Cashews</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square skeleton rounded-2xl mb-3" />
                <div className="w-4/5 h-3.5 skeleton-light rounded-md mb-2" />
                <div className="w-1/2 h-4 skeleton-light rounded-md" />
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
