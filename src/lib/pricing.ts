import type { Asset } from "./types";

export interface PricingSettings {
  deliveryBaseFee: number;
  deliveryRatePerKm: number;
  waiverFee: number;
}

// Used to seed the settings table and as a fallback if a setting is ever
// missing. The admin Settings tab edits the live values in the database.
export const DEFAULT_PRICING: PricingSettings = {
  deliveryBaseFee: 150,
  deliveryRatePerKm: 8,
  waiverFee: 120,
};

export function deliveryFeeForDistance(distanceKm: number, settings: PricingSettings): number {
  return Math.round(settings.deliveryBaseFee + Math.max(0, distanceKm) * settings.deliveryRatePerKm);
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
  waiverFee: number;
}): PriceBreakdown {
  const base = opts.asset.daily_rate * opts.days;
  const waiver = opts.waiver ? opts.waiverFee : 0;
  return { base, delivery: opts.deliveryFee, waiver, total: base + opts.deliveryFee + waiver };
}
