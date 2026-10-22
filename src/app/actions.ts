"use server";

import { revalidatePath } from "next/cache";
import {
  getAssets, getBookings, getAssetById, insertBooking, insertQuote,
  getQuoteByCode, markQuoteConverted, updateAsset, setBookingStatus, addAsset,
  insertPayment, insertDelivery,
} from "@/db/repo";
import { windowAvailability } from "@/lib/availability";
import { computePrice, deliveryFeeForDistance, DELIVERY_BASE_FEE } from "@/lib/pricing";
import { depotDistanceTo, type RouteDistance } from "@/lib/geo";
import { billedDays, iso, today, addDays } from "@/lib/dates";
import { generateQuoteCode, uid } from "@/lib/quote";
import type { AssetType, BookingStatus, Booking, QuoteSnapshot } from "@/lib/types";

export interface BookingInput {
  assetType: AssetType;
  assetId: string;
  start: string;
  end: string;
  waiver: boolean;
  address: string;
  addressLat?: number;
  addressLon?: number;
  siteContact: string;
  customer: string;
}

async function resolveDelivery(
  input: BookingInput
): Promise<{ dist: RouteDistance | null; deliveryFee: number; zoneLabel: string }> {
  const hasCoords = input.addressLat != null && input.addressLon != null;
  const dist = hasCoords ? await depotDistanceTo(input.addressLat as number, input.addressLon as number) : null;
  const deliveryFee = dist ? deliveryFeeForDistance(dist.distanceKm) : DELIVERY_BASE_FEE;
  const zoneLabel = dist
    ? `${dist.distanceKm.toFixed(1)} km from depot${dist.source === "geoapify" ? "" : " (estimated)"}`
    : "Address not geocoded — flat fee applied";
  return { dist, deliveryFee, zoneLabel };
}

async function buildBooking(
  input: BookingInput,
  status: BookingStatus,
  deliveryFee: number,
  zoneLabel: string
): Promise<Booking | { error: string }> {
  const [assets, bookings] = await Promise.all([getAssets(), getBookings()]);
  const days = billedDays(input.start, input.end);
  const avail = windowAvailability({
    assets, bookings, type: input.assetType, start: input.start, end: input.end,
  });
  if (avail.status === "unavailable") return { error: "Those dates are fully booked for this unit." };

  const asset = await getAssetById(input.assetId);
  if (!asset || !asset.active) return { error: "That unit is not available." };

  const price = computePrice({ asset, days, deliveryFee, waiver: input.waiver });
  return {
    id: uid(),
    asset_type: input.assetType,
    asset_id: input.assetId,
    customer: input.customer.trim() || "New customer",
    start_date: input.start,
    end_date: input.end,
    days,
    status,
    price_total: price.total,
    delivery_address: input.address.trim(),
    zone: zoneLabel,
    site_contact: input.siteContact.trim(),
    created_at: new Date().toISOString(),
  };
}

export async function createBookingAction(input: BookingInput) {
  const { dist, deliveryFee, zoneLabel } = await resolveDelivery(input);
  // A pending payment still holds capacity, preventing a checkout race. The
  // PayFast webhook is the only path that promotes it to reserved.
  const b = await buildBooking(input, "pending", deliveryFee, zoneLabel);
  if ("error" in b) return { ok: false as const, error: b.error };
  await insertBooking(b);
  const reference = `MZ-${b.id.slice(0, 8).toUpperCase()}`;
  await Promise.all([
    insertPayment({ id: uid(), booking_id: b.id, amount: b.price_total, gateway: "payfast", reference, status: "pending", paid_at: null, created_at: new Date().toISOString() }),
    insertDelivery({
      id: uid(), booking_id: b.id, origin_address: "MOSSANNAH Depot, 1054 Block H, Soshanguve",
      destination_address: b.delivery_address,
      distance_km: dist ? Math.round(dist.distanceKm) : null,
      duration_minutes: dist ? dist.durationMinutes : null,
      delivery_fee: deliveryFee, status: "scheduled",
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true as const, booking: b, paymentReference: reference };
}

export async function createQuoteAction(input: BookingInput) {
  const asset = await getAssetById(input.assetId);
  if (!asset) return { ok: false as const, error: "Unknown unit." };
  const days = billedDays(input.start, input.end);
  const { deliveryFee, zoneLabel } = await resolveDelivery(input);
  const price = computePrice({ asset, days, deliveryFee, waiver: input.waiver });

  const snapshot: QuoteSnapshot = {
    asset_type: input.assetType,
    asset_id: input.assetId,
    asset_name: asset.name,
    start_date: input.start,
    end_date: input.end,
    days,
    zone: zoneLabel,
    delivery_address: input.address.trim(),
    address_lat: input.addressLat ?? null,
    address_lon: input.addressLon ?? null,
    site_contact: input.siteContact.trim(),
    customer: input.customer.trim() || "New customer",
    waiver: input.waiver,
    price_total: price.total,
  };

  const code = generateQuoteCode();
  const expires = iso(addDays(today(), 2));
  await insertQuote({
    id: uid(),
    quote_code: code,
    snapshot,
    status: "active",
    expires_at: expires,
    created_at: new Date().toISOString(),
  });
  revalidatePath("/admin");
  return { ok: true as const, code, expires_at: expires };
}

export async function convertQuoteAction(code: string) {
  const quote = await getQuoteByCode(code);
  if (!quote) return { ok: false as const, error: "Quote not found." };
  if (quote.status !== "active") return { ok: false as const, error: `Quote is ${quote.status}.` };

  const s = quote.snapshot_json;
  const result = await createBookingAction({
    assetType: s.asset_type, assetId: s.asset_id ?? "", start: s.start_date, end: s.end_date,
    waiver: s.waiver, address: s.delivery_address,
    addressLat: s.address_lat ?? undefined, addressLon: s.address_lon ?? undefined,
    siteContact: s.site_contact, customer: s.customer,
  });
  if (!result.ok) return result;
  await markQuoteConverted(quote.id, result.booking.id);
  revalidatePath(`/quote/${code}`);
  return result;
}

export async function updateAssetAction(
  id: string,
  patch: { daily_rate?: number; quantity_available?: number; active?: boolean; name?: string }
) {
  await updateAsset(id, patch);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true as const };
}

export async function setBookingStatusAction(id: string, status: BookingStatus) {
  await setBookingStatus(id, status);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true as const };
}

export async function addAssetAction(type: AssetType) {
  await addAsset({
    id: uid(),
    name: type === "fridge" ? "New Fridge Unit" : "New Toilet Unit",
    type,
    category_code: type === "fridge" ? "CAT-FR-NEW" : "CAT-TL-NEW",
    description: "Newly added unit. Edit details.",
    quantity_available: 1,
    daily_rate: type === "fridge" ? 1250 : 950,
    active: true,
  });
  revalidatePath("/admin");
  return { ok: true as const };
}
