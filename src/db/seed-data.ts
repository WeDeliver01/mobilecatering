import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { iso, today, addDays, billedDays } from "@/lib/dates";
import { computePrice } from "@/lib/pricing";

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
    zone: string,
    status: string
  ) => {
    const start = iso(addDays(t, offStart));
    const end = iso(addDays(t, offEnd));
    const days = billedDays(start, end);
    const price = computePrice({ asset: { daily_rate: rate(type) }, days, zoneId: zone, waiver: true });
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
      zone,
      site_contact: "",
      created_at: new Date().toISOString(),
    };
  };

  return [
    mk("bk-1", "fridge", 5, 7, "Hazel Food Market", "Hazel Food Market, Menlyn, Pretoria", "zone-b", "confirmed"),
    mk("bk-2", "fridge", 12, 14, "Naledi & Tebogo Wedding", "Irene Country Lodge, Centurion", "zone-b", "pending"),
    mk("bk-3", "toilet", 1, 2, "Soshanguve Saturday Market", "Block H Community Grounds, Soshanguve", "zone-b", "confirmed"),
    mk("bk-4", "toilet", 3, 6, "Mokoena Family Event", "1487 Extension 4, Soshanguve", "zone-b", "confirmed"),
    mk("bk-5", "toilet", 9, 11, "Brightline Corporate Day", "Kyalami Corner, Midrand", "zone-c", "pending"),
  ];
}

export async function runSeed(db: DB): Promise<void> {
  await db.insert(schema.assets).values(seedAssets());
  await db.insert(schema.bookings).values(seedBookings());
}
