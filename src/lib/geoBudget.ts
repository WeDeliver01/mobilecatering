// A hard daily cap on Geoapify calls, shared across autocomplete and routing
// (Geoapify's free tier is one shared credit pool, not separate per-endpoint
// quotas). Once the cap is hit, every lookup for the rest of the UTC day
// falls back to the existing graceful-degradation path (no suggestions /
// straight-line distance estimate) instead of risking overage charges or a
// hard block from Geoapify. In-memory, per-process - fine for the single
// instance this app runs as (see deploy/DEPLOY.md).
//
// Set GEOAPIFY_DAILY_BUDGET to match your actual plan; defaults
// conservatively under Geoapify's free-tier daily credit allowance so
// there's headroom even if a credit costs slightly more than expected.
const DEFAULT_DAILY_BUDGET = 2500;

function dailyBudget(): number {
  const raw = Number(process.env.GEOAPIFY_DAILY_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_BUDGET;
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

let day = utcDayKey();
let used = 0;

function rollIfNewDay(): void {
  const today = utcDayKey();
  if (today !== day) { day = today; used = 0; }
}

// Call before making a Geoapify request. Returns false once the day's
// budget is spent - the caller should skip the API call and use its
// existing fallback. Reserves the slot immediately (not after a successful
// response) so concurrent requests can't all slip through right at the
// boundary.
export function tryReserveGeoapifyCall(): boolean {
  rollIfNewDay();
  if (used >= dailyBudget()) return false;
  used += 1;
  return true;
}

export function geoapifyBudgetStatus(): { used: number; limit: number; day: string } {
  rollIfNewDay();
  return { used, limit: dailyBudget(), day };
}
