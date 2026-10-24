"use server";

import { revalidatePath } from "next/cache";
import {
  getAssets, getBookings, getAssetById, insertBooking, insertQuote,
  getQuoteByCode, markQuoteConverted, updateAsset, setOrderStatus, addAsset,
  insertPayment, insertDelivery, insertConsent, getPricingSettings,
} from "@/db/repo";
import { windowAvailability } from "@/lib/availability";
import { computePrice, deliveryFeeForDistance, type PricingSettings } from "@/lib/pricing";
import { depotDistanceTo, type RouteDistance } from "@/lib/geo";
import { billedDays, iso, today, addDays } from "@/lib/dates";
import { generateQuoteCode, uid } from "@/lib/quote";
import { notifyQuoteCreated, notifyBookingRequested } from "@/lib/notifications/send";
import { createCheckout, getProvider, type PaymentMethod } from "@/lib/payments";
import { ASSET_TYPE_META, assetTypeLabel, isQuantityCapable } from "@/lib/assetTypes";
import type { AssetType, BookingStatus, Booking, QuoteSnapshot, OrderItem, ConsentMethod } from "@/lib/types";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export interface ConsentInput {
  method: ConsentMethod;
  signatureDataUrl?: string;
  termsTitle: string;
  termsBody: string;
}

export interface BookingInput {
  items: { assetType: AssetType; assetId: string; quantity?: number }[];
  start: string;
  end: string;
  deliveryTime: string;
  collectionTime: string;
  waiver: boolean;
  address: string;
  addressLat?: number;
  addressLon?: number;
  billingAddress: string;
  siteContact: string;
  eventType: string;
  customer: string;
  customerPhone: string;
  customerWhatsapp: boolean;
  customerEmail: string;
  // Required to actually book (createBookingAction enforces this); not
  // needed just to save a quote, which isn't a binding commitment yet.
  consent?: ConsentInput;
  paymentMethod?: PaymentMethod;
}

async function resolveDelivery(
  input: BookingInput,
  settings: PricingSettings
): Promise<{ dist: RouteDistance | null; deliveryFee: number; zoneLabel: string }> {
  const hasCoords = input.addressLat != null && input.addressLon != null;
  const dist = hasCoords ? await depotDistanceTo(input.addressLat as number, input.addressLon as number) : null;
  const deliveryFee = dist ? deliveryFeeForDistance(dist.distanceKm, settings) : settings.deliveryBaseFee;
  const zoneLabel = dist
    ? `${dist.distanceKm.toFixed(1)} km from depot${dist.source === "geoapify" ? "" : " (estimated)"}`
    : "Address not geocoded, flat fee applied";
  return { dist, deliveryFee, zoneLabel };
}

// Validates and prices every item in one checkout, returning one Booking row
// per item (all sharing a fresh order_id) plus the order total. Nothing is
// inserted here, so a bad item aborts the whole order cleanly.
async function buildOrder(
  input: BookingInput,
  status: BookingStatus,
  deliveryFee: number,
  zoneLabel: string,
  waiverFee: number
): Promise<{ orderId: string; bookings: Booking[]; total: number } | { error: string }> {
  if (input.items.length === 0) return { error: "Select at least one unit." };

  const [assets, existingBookings] = await Promise.all([getAssets(), getBookings()]);
  const days = billedDays(input.start, input.end);
  const orderId = uid();
  const createdAt = new Date().toISOString();
  const customer = input.customer.trim() || "New customer";
  const address = input.address.trim();
  const siteContact = input.siteContact.trim();

  const bookings: Booking[] = [];
  let base = 0;

  for (const item of input.items) {
    const quantity = isQuantityCapable(item.assetType) ? Math.max(1, Math.floor(item.quantity ?? 1)) : 1;

    const avail = windowAvailability({
      assets, bookings: existingBookings, type: item.assetType, start: input.start, end: input.end,
    });
    const shortDay = avail.days.find((d) => d.free < quantity);
    if (shortDay) {
      return quantity > 1
        ? { error: `Only ${shortDay.free} ${assetTypeLabel(item.assetType).toLowerCase()} available on ${shortDay.date}, you asked for ${quantity}.` }
        : { error: `Those dates are fully booked for ${assetTypeLabel(item.assetType)}.` };
    }

    const asset = await getAssetById(item.assetId);
    if (!asset || !asset.active) return { error: "One of the selected units is not available." };

    const itemTotal = asset.daily_rate * days * quantity;
    base += itemTotal;
    bookings.push({
      id: uid(),
      order_id: orderId,
      asset_type: item.assetType,
      asset_id: item.assetId,
      customer,
      start_date: input.start,
      end_date: input.end,
      delivery_time: input.deliveryTime.trim(),
      collection_time: input.collectionTime.trim(),
      days,
      quantity,
      status,
      price_total: itemTotal,
      delivery_address: address,
      billing_address: input.billingAddress.trim(),
      zone: zoneLabel,
      site_contact: siteContact,
      event_type: input.eventType,
      customer_phone: input.customerPhone.trim(),
      customer_whatsapp: input.customerWhatsapp,
      customer_email: input.customerEmail.trim(),
      created_at: createdAt,
    });
  }

  const total = base + deliveryFee + (input.waiver ? waiverFee : 0);
  return { orderId, bookings, total };
}

export async function createBookingAction(input: BookingInput) {
  const consent = input.consent;
  if (!consent || !consent.termsBody.trim()) {
    return { ok: false as const, error: "You must agree to the Terms & Policies to continue." };
  }
  if (consent.method === "signature" && !consent.signatureDataUrl) {
    return { ok: false as const, error: "Please sign to agree to the Terms & Policies." };
  }

  const method = input.paymentMethod ?? "eft";
  if (!getProvider(method).isEnabled()) {
    return { ok: false as const, error: `${getProvider(method).label} is not available right now. Please choose another payment method.` };
  }

  const settings = await getPricingSettings();
  const { dist, deliveryFee, zoneLabel } = await resolveDelivery(input, settings);
  // A pending payment still holds capacity, preventing a checkout race. The
  // payment webhook (or, for manual EFT, an admin marking it paid) is the
  // only path that promotes it to reserved.
  const order = await buildOrder(input, "pending", deliveryFee, zoneLabel, settings.waiverFee);
  if ("error" in order) return { ok: false as const, error: order.error };

  const reference = `MZ-${order.orderId.slice(0, 8).toUpperCase()}`;
  const customerName = order.bookings[0].customer;
  const customerEmail = order.bookings[0].customer_email;

  // Ask the gateway for a checkout link before touching the DB, so a failed
  // gateway call never leaves an orphaned pending booking behind.
  const checkout = await createCheckout(method, {
    orderId: order.orderId, reference, amount: order.total,
    customerName, customerEmail, customerPhone: order.bookings[0].customer_phone,
    description: `Mobile Catering order ${reference}`,
    returnUrl: `${SITE_URL}/consent/${order.orderId}`,
  });
  if (!checkout.ok) return { ok: false as const, error: checkout.error };

  const firstId = order.bookings[0].id;
  await Promise.all(order.bookings.map((b) => insertBooking(b)));
  await Promise.all([
    insertPayment({
      id: uid(), order_id: order.orderId, booking_id: firstId, amount: order.total,
      gateway: method, reference, status: "pending", paid_at: null, created_at: new Date().toISOString(),
    }),
    insertDelivery({
      id: uid(), order_id: order.orderId, booking_id: firstId,
      origin_address: "Mobile Catering Depot, 1054 Block H, Soshanguve",
      destination_address: order.bookings[0].delivery_address,
      distance_km: dist ? Math.round(dist.distanceKm) : null,
      duration_minutes: dist ? dist.durationMinutes : null,
      delivery_fee: deliveryFee, status: "scheduled",
    }),
    insertConsent({
      id: uid(), order_id: order.orderId, customer_name: customerName, customer_email: customerEmail,
      method: consent.method, signature_data_url: consent.signatureDataUrl ?? null,
      terms_title: consent.termsTitle, terms_body: consent.termsBody, agreed_at: new Date().toISOString(),
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin");

  notifyBookingRequested({
    orderId: order.orderId, paymentReference: reference, customer: customerName, customerEmail,
    items: order.bookings.map((b) => ({
      assetName: assetTypeLabel(b.asset_type) + (b.quantity > 1 ? ` x${b.quantity}` : ""),
    })),
    startDate: order.bookings[0].start_date, endDate: order.bookings[0].end_date,
    deliveryAddress: order.bookings[0].delivery_address, total: order.total,
  }).catch((e) => console.error("[notify] booking requested failed:", e));

  return {
    ok: true as const, orderId: order.orderId, bookings: order.bookings, total: order.total,
    paymentReference: reference, paymentMethod: method, checkoutUrl: checkout.checkoutUrl,
  };
}

export async function createQuoteAction(input: BookingInput) {
  if (input.items.length === 0) return { ok: false as const, error: "Select at least one unit." };
  const days = billedDays(input.start, input.end);
  const settings = await getPricingSettings();
  const { deliveryFee, zoneLabel } = await resolveDelivery(input, settings);

  const items: OrderItem[] = [];
  let base = 0;
  for (const item of input.items) {
    const asset = await getAssetById(item.assetId);
    if (!asset) return { ok: false as const, error: "Unknown unit." };
    const quantity = isQuantityCapable(item.assetType) ? Math.max(1, Math.floor(item.quantity ?? 1)) : 1;
    items.push({ asset_type: item.assetType, asset_id: item.assetId, asset_name: asset.name, daily_rate: asset.daily_rate, quantity });
    base += asset.daily_rate * days * quantity;
  }

  const waiverFee = input.waiver ? settings.waiverFee : 0;
  const total = base + deliveryFee + waiverFee;

  const snapshot: QuoteSnapshot = {
    items,
    start_date: input.start,
    end_date: input.end,
    delivery_time: input.deliveryTime.trim(),
    collection_time: input.collectionTime.trim(),
    days,
    zone: zoneLabel,
    delivery_address: input.address.trim(),
    billing_address: input.billingAddress.trim(),
    address_lat: input.addressLat ?? null,
    address_lon: input.addressLon ?? null,
    site_contact: input.siteContact.trim(),
    customer: input.customer.trim() || "New customer",
    event_type: input.eventType,
    customer_phone: input.customerPhone.trim(),
    customer_whatsapp: input.customerWhatsapp,
    customer_email: input.customerEmail.trim(),
    waiver: input.waiver,
    delivery_fee: deliveryFee,
    waiver_fee: waiverFee,
    price_total: total,
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

  notifyQuoteCreated({
    code, expiresAt: expires, customer: snapshot.customer, customerEmail: snapshot.customer_email,
    items, days, startDate: input.start, endDate: input.end, priceTotal: total,
  }).catch((e) => console.error("[notify] quote created failed:", e));

  return { ok: true as const, code, expires_at: expires };
}

export async function convertQuoteAction(code: string, consent: ConsentInput, paymentMethod?: PaymentMethod) {
  const quote = await getQuoteByCode(code);
  if (!quote) return { ok: false as const, error: "Quote not found." };
  if (quote.status !== "active") return { ok: false as const, error: `Quote is ${quote.status}.` };

  const s = quote.snapshot_json;
  const result = await createBookingAction({
    items: s.items.map((i) => ({ assetType: i.asset_type, assetId: i.asset_id ?? "", quantity: i.quantity })),
    start: s.start_date, end: s.end_date,
    deliveryTime: s.delivery_time, collectionTime: s.collection_time,
    waiver: s.waiver, address: s.delivery_address, billingAddress: s.billing_address,
    addressLat: s.address_lat ?? undefined, addressLon: s.address_lon ?? undefined,
    siteContact: s.site_contact, eventType: s.event_type, customer: s.customer,
    customerPhone: s.customer_phone, customerWhatsapp: s.customer_whatsapp, customerEmail: s.customer_email,
    consent, paymentMethod,
  });
  if (!result.ok) return result;
  await markQuoteConverted(quote.id, result.bookings[0].id);
  revalidatePath(`/quote/${code}`);
  return result;
}

export async function updateAssetAction(
  id: string,
  patch: { daily_rate?: number; quantity_available?: number; active?: boolean; name?: string; image_url?: string | null }
) {
  await updateAsset(id, patch);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true as const };
}

export async function setOrderStatusAction(orderOrBookingId: string, status: BookingStatus) {
  await setOrderStatus(orderOrBookingId, status);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true as const };
}

export async function addAssetAction(type: AssetType) {
  const meta = ASSET_TYPE_META[type];
  await addAsset({
    id: uid(),
    name: `New ${meta.label}`,
    type,
    category_code: `${meta.categoryPrefix}-NEW`,
    description: "Newly added unit. Edit details.",
    quantity_available: meta.defaultQuantityAvailable,
    daily_rate: meta.defaultRate,
    active: true,
    image_url: null,
  });
  revalidatePath("/admin");
  return { ok: true as const };
}
