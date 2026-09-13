// src/utils/dataCache.ts
// Lightweight "stale-while-revalidate" cache for frequently-visited lists
// (home page products, the category scroller, etc). Without this, every
// visit shows a loading skeleton while it waits on the network — even when
// nothing has actually changed since last time, which is what makes the
// app *feel* slow on every navigation.
//
// The pattern: a page seeds its state from this cache immediately (so it
// renders the last-known data with zero wait), then quietly re-fetches in
// the background and swaps in the fresh result — the user only ever sees
// a change if the data actually changed, never a spinner for data we
// already had.
//
// sessionStorage (not localStorage) on purpose: it survives client-side
// navigation AND a same-tab reload (exactly where "feels slow" shows up
// most), but still starts fresh for a new visit/session rather than
// serving indefinitely-stale data forever.

const memoryCache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  if (memoryCache.has(key)) return memoryCache.get(key) as T;
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as T;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

export function setCached<T>(key: string, value: T): void {
  memoryCache.set(key, value);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private browsing, etc.) — the in-memory
    // cache still covers the current tab, so this is safe to ignore.
  }
}
