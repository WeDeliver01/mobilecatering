import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { iso, today, addDays, billedDays } from "@/lib/dates";
import { computePrice, deliveryFeeForDistance, DEFAULT_PRICING } from "@/lib/pricing";

type DB = PgliteDatabase<typeof schema>;

// The real fleet: one mobile fridge, one double toilet.
function seedAssets() {
  return [
    {
      id: "asset-fridge",
      name: "Mobile Fridge",
      type: "fridge",
      category_code: "CAT-FR-01",
      description: "Dual-compartment cooling for catering and beverages.",
      quantity_available: 1,
      daily_rate: 1250,
      active: true,
      image_url: null,
    },
    {
      id: "asset-toilet",
      name: "Double Toilet (men & women)",
      type: "toilet",
      category_code: "CAT-TL-05",
      description: "Two-side portable sanitation with interior lighting and sinks.",
      quantity_available: 1,
      daily_rate: 950,
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
    status: string
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
      asset_type: type,
      asset_id: type === "fridge" ? "asset-fridge" : "asset-toilet",
      customer,
      start_date: start,
      end_date: end,
      days,
      status,
      price_total: price.total,
      delivery_address: address,
      zone: `${distanceKm.toFixed(1)} km from depot (estimated)`,
      site_contact: "",
      created_at: new Date().toISOString(),
    };
  };

  return [
    mk("bk-1", "fridge", 5, 7, "Hazel Food Market", "Hazel Food Market, Menlyn, Pretoria", 28, "confirmed"),
    mk("bk-2", "fridge", 12, 14, "Naledi & Tebogo Wedding", "Irene Country Lodge, Centurion", 42, "pending"),
    mk("bk-3", "toilet", 1, 2, "Soshanguve Saturday Market", "Block H Community Grounds, Soshanguve", 1.5, "confirmed"),
    mk("bk-4", "toilet", 3, 6, "Mokoena Family Event", "1487 Extension 4, Soshanguve", 3, "confirmed"),
    mk("bk-5", "toilet", 9, 11, "Brightline Corporate Day", "Kyalami Corner, Midrand", 35, "pending"),
  ];
}

export function seedSettings(): { key: string; value: string }[] {
  return [
    { key: "delivery_base_fee", value: String(DEFAULT_PRICING.deliveryBaseFee) },
    { key: "delivery_rate_per_km", value: String(DEFAULT_PRICING.deliveryRatePerKm) },
    { key: "waiver_fee", value: String(DEFAULT_PRICING.waiverFee) },
  ];
}

export function seedSiteContent(): { slug: string; title: string; body: string; updated_at: string }[] {
  const now = new Date().toISOString();
  return [
    {
      slug: "about",
      title: "About Mobile Catering",
      body:
        "Mobile Catering (MOSSANNAH) hires out mobile fridge trailers and portable toilet trailers for events " +
        "across Gauteng. We deliver, set up and collect, so you can focus on the event, not the logistics.\n\n" +
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
