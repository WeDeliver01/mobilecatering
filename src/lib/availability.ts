import type { Asset, Booking, AssetType, AvailabilityResult, AvailabilityVerdict } from "./types";
import { occupiedDays, parse, iso, addDays } from "./dates";

/**
 * Authoritative availability engine.
 * A booking for [start, end] is valid only if every day in that window has at
 * least one free unit of the requested type. Capacity = sum of active units of
 * that type. Overlap counts every non-cancelled booking covering a given day.
 */
export function windowAvailability(args: {
  assets: Asset[];
  bookings: Booking[];
  type: AssetType;
  start: string;
  end: string;
  ignoreBookingId?: string;
}): AvailabilityResult {
  const { assets, bookings, type, start, end, ignoreBookingId } = args;

  const capacity = assets
    .filter((a) => a.type === type && a.active)
    .reduce((s, a) => s + a.quantity_available, 0);

  const live = bookings.filter(
    (b) => b.asset_type === type && b.status !== "cancelled" && b.id !== ignoreBookingId
  );

  const consumed: Record<string, number> = {};
  for (const b of live) {
    for (const day of occupiedDays(b.start_date, b.end_date)) {
      consumed[day] = (consumed[day] || 0) + 1;
    }
  }

  const days: { date: string; free: number }[] = [];
  let cur = parse(start);
  const stop = parse(end);
  while (cur <= stop) {
    const key = iso(cur);
    days.push({ date: key, free: Math.max(0, capacity - (consumed[key] || 0)) });
    cur = addDays(cur, 1);
  }

  const minFree = days.reduce((m, d) => Math.min(m, d.free), capacity);
  return { capacity, minFree, days, status: verdict(minFree, capacity) };
}

export function verdict(minFree: number, capacity: number): AvailabilityVerdict {
  // No free unit on at least one day in the window.
  if (minFree <= 0) return "unavailable";
  // Every unit is free across the whole window.
  if (minFree >= capacity) return "available";
  // Multi-unit fleets only: some units already committed on a day in the window.
  return "limited";
}
