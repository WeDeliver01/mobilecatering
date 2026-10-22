// Tiny in-memory TTL cache, server-side only. Good enough for a single Node
// process (this app runs as one instance — see deploy/DEPLOY.md) and avoids
// burning Geoapify's free-tier quota on repeat lookups: the same venue gets
// quoted many times, and autocomplete re-queries the same prefixes as users
// type and backspace.
interface Entry<T> { value: T; expires: number }

class TtlCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private ttlMs: number, private maxEntries = 500) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expires < Date.now()) { this.store.delete(key); return undefined; }
    return e.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

// Address text -> suggestion list. Addresses don't change, so cache for a day.
export const autocompleteCache = new TtlCache<unknown>(24 * 60 * 60 * 1000);

// "lat,lon" (rounded) -> route distance. Static for a given point, cache for a month.
export const routeCache = new TtlCache<unknown>(30 * 24 * 60 * 60 * 1000);

// Rounds to ~11m precision so nearby points (same venue, slightly different
// pins) share one cache entry instead of each costing a fresh routing call.
export function roundCoord(n: number): number {
  return Math.round(n * 10000) / 10000;
}
