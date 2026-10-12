import { NextRequest, NextResponse } from "next/server";
import { getAssets, getBookings } from "@/db/repo";
import { windowAvailability } from "@/lib/availability";
import type { AssetType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") as AssetType | null;
  const start = sp.get("start");
  const end = sp.get("end");
  if (!type || !start || !end) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }
  const [assets, bookings] = await Promise.all([getAssets(), getBookings()]);
  const result = windowAvailability({ assets, bookings, type, start, end });
  return NextResponse.json(result);
}
