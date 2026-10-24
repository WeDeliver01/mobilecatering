// Small in-memory sliding-window limiter for public, unauthenticated API
// routes. Not for correctness under multi-instance deployment (this app
// runs as a single process, see deploy/DEPLOY.md) - just to stop one
// client (bot, broken tab stuck in a loop, deliberate abuse) from burning
// the Geoapify daily budget on its own before anyone else gets a look in.
const windows = new Map<string, number[]>();
const MAX_KEYS = 5000; // evict oldest-seen key if this is exceeded, cheap safety valve

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return true;
  }
  hits.push(now);
  if (windows.size >= MAX_KEYS && !windows.has(key)) {
    const oldest = windows.keys().next().value;
    if (oldest !== undefined) windows.delete(oldest);
  }
  windows.set(key, hits);
  return false;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headers.get("x-real-ip")
    ?? "unknown";
}
