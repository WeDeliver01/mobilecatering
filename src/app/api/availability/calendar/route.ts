import { NextRequest, NextResponse } from "next/server";
import { getAssets, getBookings } from "@/db/repo";
import { windowAvailability } from "@/lib/availability";
import type { AssetType } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface CalendarDay {
  date: string;
  fullyBooked: boolean; // at least one requested type has zero free units
  limited: boolean;     // not fully booked, but at least one type is partially committed
}

// Powers the custom date-picker calendar: one call covers a whole visible
// month for every currently-selected unit type at once (a day that's fully
// booked for ANY of them can't be picked, since the whole order needs every
// item on the same dates).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const typesParam = sp.get("types");
  const start = sp.get("start");
  const end = sp.get("end");
  if (!typesParam || !start || !end) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }
  const types = typesParam.split(",").filter(Boolean) as AssetType[];
  if (types.length === 0) return NextResponse.json({ days: [] as CalendarDay[] });

  const [assets, bookings] = await Promise.all([getAssets(), getBookings()]);

  const perType = types.map((type) => windowAvailability({ assets, bookings, type, start, end }));

  const byDate = new Map<string, CalendarDay>();
  for (const result of perType) {
    for (const d of result.days) {
      const existing = byDate.get(d.date) ?? { date: d.date, fullyBooked: false, limited: false };
      if (d.free <= 0) existing.fullyBooked = true;
      else if (d.free < result.capacity) existing.limited = true;
      byDate.set(d.date, existing);
    }
  }

  const days = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ days });
}
