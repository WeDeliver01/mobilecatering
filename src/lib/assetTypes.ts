import type { AssetType } from "./types";

// Single source of truth for every hireable item type: label, icon, default
// pricing/category code for new assets, and whether it's sold by quantity
// (chairs) rather than as one unit per booking (everything else).
export const ASSET_TYPES: AssetType[] = [
  "fridge", "toilet", "food_warmer", "mobile_kitchen", "marquee_tent", "chairs",
];

export interface AssetTypeMeta {
  label: string;
  icon: string;
  categoryPrefix: string;
  defaultRate: number; // whole Rand per day (per chair, for quantity-capable types)
  defaultQuantityAvailable: number;
  quantityCapable: boolean;
}

export const ASSET_TYPE_META: Record<AssetType, AssetTypeMeta> = {
  fridge: {
    label: "Mobile Fridge", icon: "ac_unit", categoryPrefix: "CAT-FR",
    defaultRate: 1250, defaultQuantityAvailable: 1, quantityCapable: false,
  },
  toilet: {
    label: "Double Toilet", icon: "wc", categoryPrefix: "CAT-TL",
    defaultRate: 950, defaultQuantityAvailable: 1, quantityCapable: false,
  },
  food_warmer: {
    label: "Mobile Food Warmer", icon: "soup_kitchen", categoryPrefix: "CAT-FW",
    defaultRate: 600, defaultQuantityAvailable: 1, quantityCapable: false,
  },
  mobile_kitchen: {
    label: "Mobile Kitchen", icon: "kitchen", categoryPrefix: "CAT-MK",
    defaultRate: 1800, defaultQuantityAvailable: 1, quantityCapable: false,
  },
  marquee_tent: {
    label: "Marquee Tent (10m x 5m)", icon: "festival", categoryPrefix: "CAT-MQ",
    defaultRate: 2500, defaultQuantityAvailable: 1, quantityCapable: false,
  },
  // Priced and booked per chair, not per set - see quantityCapable below.
  chairs: {
    label: "Chairs", icon: "chair", categoryPrefix: "CAT-CH",
    defaultRate: 15, defaultQuantityAvailable: 200, quantityCapable: true,
  },
};

export function assetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_META[type]?.label ?? type;
}

export function isQuantityCapable(type: AssetType): boolean {
  return ASSET_TYPE_META[type]?.quantityCapable ?? false;
}
