import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { iso, today, addDays, billedDays } from "@/lib/dates";
import { computePrice, deliveryFeeForDistance, DEFAULT_PRICING } from "@/lib/pricing";
import { DEFAULT_COMPANY, COMPANY_SETTINGS_KEYS } from "@/lib/company";
import { ASSET_TYPE_META } from "@/lib/assetTypes";

type DB = PgliteDatabase<typeof schema>;

// The real fleet.
function seedAssets() {
  return [
    {
      id: "asset-fridge",
      name: ASSET_TYPE_META.fridge.label,
      type: "fridge",
      category_code: `${ASSET_TYPE_META.fridge.categoryPrefix}-01`,
      description: "Dual-compartment cooling for catering and beverages.",
      quantity_available: 1,
      daily_rate: ASSET_TYPE_META.fridge.defaultRate,
      active: true,
      image_url: "/images/mobile-fridge-trailer.webp",
    },
    {
      id: "asset-toilet",
      name: "Double Toilet (men & women)",
      type: "toilet",
      category_code: `${ASSET_TYPE_META.toilet.categoryPrefix}-05`,
      description: "Two-side portable sanitation with interior lighting and sinks.",
      quantity_available: 1,
      daily_rate: ASSET_TYPE_META.toilet.defaultRate,
      active: true,
      image_url: "/images/double-toilet-trailer.jpg",
    },
    {
      id: "asset-food-warmer",
      name: ASSET_TYPE_META.food_warmer.label,
      type: "food_warmer",
      category_code: `${ASSET_TYPE_META.food_warmer.categoryPrefix}-01`,
      description: "Keeps prepared food service-ready for the duration of your event.",
      quantity_available: 1,
      daily_rate: ASSET_TYPE_META.food_warmer.defaultRate,
      active: true,
      image_url: null,
    },
    {
      id: "asset-mobile-kitchen",
      name: ASSET_TYPE_META.mobile_kitchen.label,
      type: "mobile_kitchen",
      category_code: `${ASSET_TYPE_META.mobile_kitchen.categoryPrefix}-01`,
      description: "Fully equipped mobile kitchen trailer for on-site food prep.",
      quantity_available: 1,
      daily_rate: ASSET_TYPE_META.mobile_kitchen.defaultRate,
      active: true,
      image_url: null,
    },
    {
      id: "asset-marquee-tent",
      name: ASSET_TYPE_META.marquee_tent.label,
      type: "marquee_tent",
      category_code: `${ASSET_TYPE_META.marquee_tent.categoryPrefix}-01`,
      description: "10m x 5m marquee tent, ideal cover for mid-size events.",
      quantity_available: 1,
      daily_rate: ASSET_TYPE_META.marquee_tent.defaultRate,
      active: true,
      image_url: "/images/marquee-tent.webp",
    },
    {
      id: "asset-chairs",
      name: ASSET_TYPE_META.chairs.label,
      type: "chairs",
      category_code: `${ASSET_TYPE_META.chairs.categoryPrefix}-01`,
      description: "Event seating, priced and booked per chair.",
      quantity_available: ASSET_TYPE_META.chairs.defaultQuantityAvailable,
      daily_rate: ASSET_TYPE_META.chairs.defaultRate,
      active: true,
      image_url: null,
    },
  ];
}

function seedBookings() {
  const t = today();
  const rate = (type: string) => (type === "fridge" ? 1250 : 950);
  const mk = (
    id: string,
    type: "fridge" | "toilet",
    offStart: number,
    offEnd: number,
    customer: string,
    address: string,
    distanceKm: number,
    status: string,
    eventType: string
  ) => {
    const start = iso(addDays(t, offStart));
    const end = iso(addDays(t, offEnd));
    const days = billedDays(start, end);
    const deliveryFee = deliveryFeeForDistance(distanceKm, DEFAULT_PRICING);
    const price = computePrice({
      asset: { daily_rate: rate(type) }, days, deliveryFee, waiver: true, waiverFee: DEFAULT_PRICING.waiverFee,
    });
    return {
      id,
      order_id: id, // each seeded booking is its own single-item order
      asset_type: type,
      asset_id: type === "fridge" ? "asset-fridge" : "asset-toilet",
      customer,
      start_date: start,
      end_date: end,
      delivery_time: "09:00",
      collection_time: "17:00",
      days,
      quantity: 1,
      status,
      price_total: price.total,
      delivery_address: address,
      billing_address: "",
      zone: `${distanceKm.toFixed(1)} km from depot (estimated)`,
      site_contact: "",
      event_type: eventType,
      customer_phone: "",
      customer_whatsapp: false,
      customer_email: "",
      created_at: new Date().toISOString(),
    };
  };

  return [
    mk("bk-1", "fridge", 5, 7, "Hazel Food Market", "Hazel Food Market, Menlyn, Pretoria", 28, "confirmed", "Festival or market"),
    mk("bk-2", "fridge", 12, 14, "Naledi & Tebogo Wedding", "Irene Country Lodge, Centurion", 42, "pending", "Wedding"),
    mk("bk-3", "toilet", 1, 2, "Soshanguve Saturday Market", "Block H Community Grounds, Soshanguve", 1.5, "confirmed", "Festival or market"),
    mk("bk-4", "toilet", 3, 6, "Mokoena Family Event", "1487 Extension 4, Soshanguve", 3, "confirmed", "Birthday party"),
    mk("bk-5", "toilet", 9, 11, "Brightline Corporate Day", "Kyalami Corner, Midrand", 35, "pending", "Corporate event"),
  ];
}

export function seedSettings(): { key: string; value: string }[] {
  const company = (Object.keys(COMPANY_SETTINGS_KEYS) as (keyof typeof COMPANY_SETTINGS_KEYS)[]).map((k) => ({
    key: COMPANY_SETTINGS_KEYS[k],
    value: DEFAULT_COMPANY[k],
  }));
  return [
    { key: "delivery_base_fee", value: String(DEFAULT_PRICING.deliveryBaseFee) },
    { key: "delivery_rate_per_km", value: String(DEFAULT_PRICING.deliveryRatePerKm) },
    { key: "waiver_fee", value: String(DEFAULT_PRICING.waiverFee) },
    ...company,
  ];
}

export function seedSiteContent(): { slug: string; title: string; body: string; updated_at: string }[] {
  const now = new Date().toISOString();
  return [
    {
      slug: "about",
      title: "About Mobile Catering",
      body:
        "Mobile Catering (MOSSANNAH) hires out mobile fridges, portable toilets, food warmers, mobile kitchens, " +
        "marquee tents and chairs for events across Gauteng. We deliver, set up and collect, so you can focus " +
        "on the event, not the logistics.\n\n" +
        "Edit this text any time from Admin > Settings > Content.",
      updated_at: now,
    },
    {
      slug: "terms",
      title: "Terms & Policies",
      body:
        "Payment: a booking is held as pending until payment is confirmed. Reference your payment with the " +
        "code shown at checkout.\n\n" +
        "Delivery: delivery and collection are included in the quoted price for the address you provide. " +
        "Fees are calculated by distance from our depot.\n\n" +
        "Damage waiver: an optional flat fee that covers accidental damage to the unit while on site.\n\n" +
        "Cancellations: contact us as early as possible if your event date changes. Edit this text any time " +
        "from Admin > Settings > Content.",
      updated_at: now,
    },
  ];
}

export async function runSeed(db: DB): Promise<void> {
  await db.insert(schema.assets).values(seedAssets());
  await db.insert(schema.bookings).values(seedBookings());
}
