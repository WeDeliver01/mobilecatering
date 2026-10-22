import { eq, sql } from "drizzle-orm";
import { getDb } from "./client";
import * as schema from "./schema";
import type {
  Asset, Booking, Quote, AssetType, BookingStatus, QuoteSnapshot, Payment, Invoice, Delivery,
  PaymentStatus, DeliveryStatus, SiteContent, GalleryImage,
} from "@/lib/types";
import { DEFAULT_PRICING, type PricingSettings } from "@/lib/pricing";

type AssetRow = typeof schema.assets.$inferSelect;
type BookingRow = typeof schema.bookings.$inferSelect;
type QuoteRow = typeof schema.quotes.$inferSelect;
type PaymentRow = typeof schema.payments.$inferSelect;
type InvoiceRow = typeof schema.invoices.$inferSelect;
type DeliveryRow = typeof schema.deliveries.$inferSelect;

const toAsset = (r: AssetRow): Asset => ({
  id: r.id,
  name: r.name,
  type: r.type as AssetType,
  category_code: r.category_code,
  description: r.description,
  quantity_available: r.quantity_available,
  daily_rate: r.daily_rate,
  active: r.active,
  image_url: r.image_url ?? null,
});

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  asset_type: r.asset_type as AssetType,
  asset_id: r.asset_id,
  customer: r.customer,
  start_date: r.start_date,
  end_date: r.end_date,
  days: r.days,
  status: r.status as BookingStatus,
  price_total: r.price_total,
  delivery_address: r.delivery_address,
  zone: r.zone,
  site_contact: r.site_contact,
  created_at: r.created_at,
});

const toQuote = (r: QuoteRow): Quote => ({
  id: r.id,
  quote_code: r.quote_code,
  snapshot_json: JSON.parse(r.snapshot_json) as QuoteSnapshot,
  status: r.status as Quote["status"],
  expires_at: r.expires_at,
  converted_booking_id: r.converted_booking_id,
  created_at: r.created_at,
});
const toPayment = (r: PaymentRow): Payment => ({ ...r, status: r.status as PaymentStatus, paid_at: r.paid_at ?? null });
const toInvoice = (r: InvoiceRow): Invoice => ({ ...r });
const toDelivery = (r: DeliveryRow): Delivery => ({
  ...r, distance_km: r.distance_km ?? null, duration_minutes: r.duration_minutes ?? null,
  status: r.status as DeliveryStatus,
});

export async function getAssets(): Promise<Asset[]> {
  const db = await getDb();
  return (await db.select().from(schema.assets)).map(toAsset);
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  const db = await getDb();
  const rows = await db.select().from(schema.assets).where(eq(schema.assets.id, id)).limit(1);
  return rows[0] ? toAsset(rows[0]) : undefined;
}

export async function getBookings(): Promise<Booking[]> {
  const db = await getDb();
  return (await db.select().from(schema.bookings)).map(toBooking);
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const db = await getDb();
  const rows = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1);
  return rows[0] ? toBooking(rows[0]) : undefined;
}

export async function getQuotes(): Promise<Quote[]> {
  const db = await getDb();
  return (await db.select().from(schema.quotes)).map(toQuote);
}

export async function getPayments(): Promise<Payment[]> {
  const db = await getDb();
  return (await db.select().from(schema.payments)).map(toPayment);
}

export async function getInvoices(): Promise<Invoice[]> {
  const db = await getDb();
  return (await db.select().from(schema.invoices)).map(toInvoice);
}

export async function getDeliveries(): Promise<Delivery[]> {
  const db = await getDb();
  return (await db.select().from(schema.deliveries)).map(toDelivery);
}

export async function getInvoiceByBookingId(bookingId: string): Promise<Invoice | undefined> {
  const db = await getDb();
  const rows = await db.select().from(schema.invoices).where(eq(schema.invoices.booking_id, bookingId)).limit(1);
  return rows[0] ? toInvoice(rows[0]) : undefined;
}

export async function getQuoteByCode(code: string): Promise<Quote | undefined> {
  const db = await getDb();
  const rows = await db.select().from(schema.quotes).where(eq(schema.quotes.quote_code, code)).limit(1);
  return rows[0] ? toQuote(rows[0]) : undefined;
}

export async function insertBooking(b: Booking): Promise<void> {
  const db = await getDb();
  await db.insert(schema.bookings).values({ ...b });
}

export async function insertPayment(payment: Payment): Promise<void> {
  const db = await getDb();
  await db.insert(schema.payments).values(payment);
}

export async function insertDelivery(delivery: Delivery): Promise<void> {
  const db = await getDb();
  await db.insert(schema.deliveries).values(delivery);
}

export async function insertInvoice(invoice: Invoice): Promise<void> {
  const db = await getDb();
  await db.insert(schema.invoices).values(invoice);
}

export async function markPaymentPaid(reference: string): Promise<Payment | undefined> {
  const db = await getDb();
  const rows = await db.select().from(schema.payments).where(eq(schema.payments.reference, reference)).limit(1);
  if (!rows[0]) return undefined;
  await db.update(schema.payments).set({ status: "paid", paid_at: new Date().toISOString() }).where(eq(schema.payments.reference, reference));
  return { ...toPayment(rows[0]), status: "paid", paid_at: new Date().toISOString() };
}

export async function setDeliveryStatus(id: string, status: DeliveryStatus): Promise<void> {
  const db = await getDb();
  await db.update(schema.deliveries).set({ status }).where(eq(schema.deliveries.id, id));
}

export async function insertQuote(q: {
  id: string; quote_code: string; snapshot: QuoteSnapshot;
  status: string; expires_at: string; created_at: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(schema.quotes).values({
    id: q.id,
    quote_code: q.quote_code,
    snapshot_json: JSON.stringify(q.snapshot),
    status: q.status,
    expires_at: q.expires_at,
    converted_booking_id: null,
    created_at: q.created_at,
  });
}

export async function updateAsset(
  id: string,
  patch: Partial<Pick<Asset, "daily_rate" | "quantity_available" | "active" | "name" | "description" | "image_url">>
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (patch.daily_rate !== undefined) set.daily_rate = patch.daily_rate;
  if (patch.quantity_available !== undefined) set.quantity_available = patch.quantity_available;
  if (patch.active !== undefined) set.active = patch.active;
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.image_url !== undefined) set.image_url = patch.image_url;
  if (Object.keys(set).length === 0) return;
  const db = await getDb();
  await db.update(schema.assets).set(set).where(eq(schema.assets.id, id));
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const db = await getDb();
  await db.update(schema.bookings).set({ status }).where(eq(schema.bookings.id, id));
}

export async function markQuoteConverted(quoteId: string, bookingId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.quotes)
    .set({ status: "converted", converted_booking_id: bookingId })
    .where(eq(schema.quotes.id, quoteId));
}

export async function addAsset(a: Asset): Promise<void> {
  const db = await getDb();
  await db.insert(schema.assets).values({
    id: a.id, name: a.name, type: a.type, category_code: a.category_code,
    description: a.description, quantity_available: a.quantity_available,
    daily_rate: a.daily_rate, active: a.active, image_url: a.image_url,
  });
}

export async function expireOldQuotes(): Promise<void> {
  const db = await getDb();
  const todayIso = new Date().toISOString().slice(0, 10);
  await db.execute(sql`UPDATE quotes SET status='expired' WHERE status='active' AND expires_at < ${todayIso}`);
}

/* ---------------- Settings (delivery pricing) ---------------- */

export async function getPricingSettings(): Promise<PricingSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const v = Number(map[key]);
    return Number.isFinite(v) ? v : fallback;
  };
  return {
    deliveryBaseFee: num("delivery_base_fee", DEFAULT_PRICING.deliveryBaseFee),
    deliveryRatePerKm: num("delivery_rate_per_km", DEFAULT_PRICING.deliveryRatePerKm),
    waiverFee: num("waiver_fee", DEFAULT_PRICING.waiverFee),
  };
}

export async function updatePricingSettings(patch: Partial<PricingSettings>): Promise<void> {
  const db = await getDb();
  const entries: [string, number | undefined][] = [
    ["delivery_base_fee", patch.deliveryBaseFee],
    ["delivery_rate_per_km", patch.deliveryRatePerKm],
    ["waiver_fee", patch.waiverFee],
  ];
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    await db.execute(sql`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)})
      ON CONFLICT (key) DO UPDATE SET value = ${String(value)}`);
  }
}

/* ---------------- Site content (About, Terms & Policies) ---------------- */

export async function getAllSiteContent(): Promise<SiteContent[]> {
  const db = await getDb();
  return db.select().from(schema.siteContent);
}

export async function getSiteContent(slug: string): Promise<SiteContent | undefined> {
  const db = await getDb();
  const rows = await db.select().from(schema.siteContent).where(eq(schema.siteContent.slug, slug)).limit(1);
  return rows[0];
}

export async function upsertSiteContent(slug: string, title: string, body: string): Promise<void> {
  const db = await getDb();
  const updated_at = new Date().toISOString();
  await db.execute(sql`INSERT INTO site_content (slug, title, body, updated_at)
    VALUES (${slug}, ${title}, ${body}, ${updated_at})
    ON CONFLICT (slug) DO UPDATE SET title = ${title}, body = ${body}, updated_at = ${updated_at}`);
}

/* ---------------- Gallery ---------------- */

export async function getGalleryImages(): Promise<GalleryImage[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.galleryImages);
  return rows.sort((a, b) => a.sort_order - b.sort_order);
}

export async function addGalleryImage(img: GalleryImage): Promise<void> {
  const db = await getDb();
  await db.insert(schema.galleryImages).values(img);
}

export async function deleteGalleryImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.galleryImages).where(eq(schema.galleryImages.id, id));
}
