export type AssetType = "fridge" | "toilet";
export type BookingStatus = "pending" | "confirmed" | "reserved" | "active" | "completed" | "cancelled";
export type QuoteStatus = "active" | "converted" | "expired";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type DeliveryStatus = "scheduled" | "out_for_delivery" | "delivered" | "collected" | "cancelled";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category_code: string;
  description: string;
  quantity_available: number;
  daily_rate: number; // whole Rand
  active: boolean;
  image_url: string | null;
}

// One row per hired item. Rows sharing an order_id were booked together in
// one checkout (same dates, address, payment and delivery); price_total on
// each row is that item's own subtotal, not the order total. See
// src/lib/order.ts for grouping rows back into orders for display.
export interface Booking {
  id: string;
  order_id: string | null;
  asset_type: AssetType;
  asset_id: string | null;
  customer: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  delivery_time: string; // "HH:MM", informational only, not used in billing
  collection_time: string;
  days: number;
  status: BookingStatus;
  price_total: number;
  delivery_address: string;
  billing_address: string; // empty = same as delivery_address
  zone: string;
  site_contact: string;
  event_type: string;
  customer_phone: string;
  customer_whatsapp: boolean;
  customer_email: string;
  created_at: string;
}

export interface OrderItem {
  asset_type: AssetType;
  asset_id: string | null;
  asset_name: string;
  daily_rate: number;
}

export interface QuoteSnapshot {
  items: OrderItem[];
  start_date: string;
  end_date: string;
  delivery_time: string;
  collection_time: string;
  days: number;
  zone: string; // human-readable delivery distance description, e.g. "12.4 km from depot"
  delivery_address: string;
  billing_address: string;
  address_lat: number | null;
  address_lon: number | null;
  site_contact: string;
  customer: string;
  event_type: string;
  customer_phone: string;
  customer_whatsapp: boolean;
  customer_email: string;
  waiver: boolean;
  delivery_fee: number;
  waiver_fee: number;
  price_total: number;
}

export interface Quote {
  id: string;
  quote_code: string;
  snapshot_json: QuoteSnapshot;
  status: QuoteStatus;
  expires_at: string;
  converted_booking_id: string | null;
  created_at: string;
}

// booking_id is the order's first/representative item (kept for simple
// single-item lookups); order_id is the authoritative grouping key.
export interface Payment {
  id: string;
  order_id: string | null;
  booking_id: string;
  amount: number;
  gateway: string;
  reference: string;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface InvoiceLineItem {
  label: string;
  amount: number;
}

export interface Invoice {
  id: string;
  order_id: string | null;
  booking_id: string;
  invoice_number: string;
  total: number;
  items: InvoiceLineItem[];
  issued_at: string;
}

export interface Delivery {
  id: string;
  order_id: string | null;
  booking_id: string;
  origin_address: string;
  destination_address: string;
  distance_km: number | null;
  duration_minutes: number | null;
  delivery_fee: number;
  status: DeliveryStatus;
}

export interface SiteContent {
  slug: string;
  title: string;
  body: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  sort_order: number;
}

export const EVENT_TYPES = [
  "Wedding",
  "Birthday party",
  "Corporate event",
  "Festival or market",
  "Funeral or memorial",
  "Community or church event",
  "Other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type AvailabilityVerdict = "available" | "limited" | "unavailable";

export interface AvailabilityResult {
  capacity: number;
  minFree: number;
  days: { date: string; free: number }[];
  status: AvailabilityVerdict;
}
