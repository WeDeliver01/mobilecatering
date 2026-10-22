import type { Asset } from "./types";

export const WAIVER_FEE = 120; // optional damage waiver, flat per booking

// Delivery is priced on real distance from the depot (see src/lib/geo.ts),
// not a flat zone fee: a base fee covers depot-adjacent jobs, plus a flat
// rate per km beyond that.
export const DELIVERY_BASE_FEE = 150;
export const DELIVERY_RATE_PER_KM = 8;

export function deliveryFeeForDistance(distanceKm: number): number {
  return Math.round(DELIVERY_BASE_FEE + Math.max(0, distanceKm) * DELIVERY_RATE_PER_KM);
}

export interface PriceBreakdown {
  base: number;
  delivery: number;
  waiver: number;
  total: number;
}

export function computePrice(opts: {
  asset: Pick<Asset, "daily_rate">;
  days: number;
  deliveryFee: number;
  waiver: boolean;
}): PriceBreakdown {
  const base = opts.asset.daily_rate * opts.days;
  const waiver = opts.waiver ? WAIVER_FEE : 0;
  return { base, delivery: opts.deliveryFee, waiver, total: base + opts.deliveryFee + waiver };
}
