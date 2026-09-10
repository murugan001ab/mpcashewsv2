// src/hooks/useInfiniteRowSentinel.ts
// Attaches an IntersectionObserver to a sentinel element placed at the end
// of a horizontally-scrolling row. When the sentinel scrolls into view
// (i.e. the user has scrolled near the end of the row), onLoadMore fires —
// used to paginate "related products" style rows as the user scrolls them.
import { useEffect, useRef } from "react";

export function useInfiniteRowSentinel(
  containerRef: React.RefObject<HTMLElement | null>,
  onLoadMore: () => void,
  options?: { enabled?: boolean; rootMargin?: string }
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const enabled = options?.enabled ?? true;
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled) return;
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMoreRef.current();
      },
      { root, rootMargin: options?.rootMargin ?? "0px 400px 0px 0px", threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, containerRef, options?.rootMargin]);

  return sentinelRef;
}
