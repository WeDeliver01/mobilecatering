import type { Asset } from "./types";

export interface Zone {
  id: string;
  name: string;
  detail: string;
  fee: number;
}

// Gauteng delivery zones (flat fee per trip). Editable here until Maps distance pricing lands.
export const ZONES: Zone[] = [
  { id: "zone-a", name: "Zone A", detail: "Sandton / Rosebank", fee: 450 },
  { id: "zone-b", name: "Zone B", detail: "Pretoria Central", fee: 550 },
  { id: "zone-c", name: "Zone C", detail: "Johannesburg South", fee: 650 },
  { id: "zone-d", name: "Zone D", detail: "Outer Gauteng", fee: 950 },
];

export const WAIVER_FEE = 120; // optional damage waiver, flat per booking

export interface PriceBreakdown {
  base: number;
  delivery: number;
  waiver: number;
  total: number;
}

export function computePrice(opts: {
  asset: Pick<Asset, "daily_rate">;
  days: number;
  zoneId: string;
  waiver: boolean;
}): PriceBreakdown {
  const base = opts.asset.daily_rate * opts.days;
  const delivery = ZONES.find((z) => z.id === opts.zoneId)?.fee ?? 0;
  const waiver = opts.waiver ? WAIVER_FEE : 0;
  return { base, delivery, waiver, total: base + delivery + waiver };
}

export const zoneById = (id: string): Zone | undefined => ZONES.find((z) => z.id === id);
