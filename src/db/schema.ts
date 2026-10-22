import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

// Standard Postgres schema. Runs on local PGlite now and on Supabase Postgres later, unchanged.
export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category_code: text("category_code").notNull().default(""),
  description: text("description").notNull().default(""),
  quantity_available: integer("quantity_available").notNull().default(1),
  daily_rate: integer("daily_rate").notNull().default(0),
  active: boolean("active").notNull().default(true),
  image_url: text("image_url"),
});

// One row per hired item. Several rows share an order_id when a customer
// hires more than one unit in a single checkout (same dates, address,
// payment and delivery); price_total on each row is that item's own
// subtotal (daily_rate x days), not the order total. See src/lib/order.ts.
export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  order_id: text("order_id"),
  asset_type: text("asset_type").notNull(),
  asset_id: text("asset_id"),
  customer: text("customer").notNull().default(""),
  start_date: text("start_date").notNull(),
  end_date: text("end_date").notNull(),
  delivery_time: text("delivery_time").notNull().default(""), // "HH:MM", informational only
  collection_time: text("collection_time").notNull().default(""),
  days: integer("days").notNull().default(1),
  status: text("status").notNull().default("pending"),
  price_total: integer("price_total").notNull().default(0),
  delivery_address: text("delivery_address").notNull().default(""),
  billing_address: text("billing_address").notNull().default(""), // empty = same as delivery
  zone: text("zone").notNull().default(""),
  site_contact: text("site_contact").notNull().default(""),
  event_type: text("event_type").notNull().default(""),
  customer_phone: text("customer_phone").notNull().default(""),
  customer_whatsapp: boolean("customer_whatsapp").notNull().default(false),
  customer_email: text("customer_email").notNull().default(""),
  created_at: text("created_at").notNull(),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  quote_code: text("quote_code").notNull().unique(),
  snapshot_json: text("snapshot_json").notNull(),
  status: text("status").notNull().default("active"),
  expires_at: text("expires_at").notNull(),
  converted_booking_id: text("converted_booking_id"),
  created_at: text("created_at").notNull(),
});

// booking_id is kept as the order's first/representative item, for the
// existing single-item lookups; order_id is the authoritative grouping key.
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  order_id: text("order_id"),
  booking_id: text("booking_id").notNull(),
  amount: integer("amount").notNull(),
  gateway: text("gateway").notNull().default("payfast"),
  reference: text("reference").notNull().unique(),
  status: text("status").notNull().default("pending"),
  paid_at: text("paid_at"),
  created_at: text("created_at").notNull(),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  order_id: text("order_id"),
  booking_id: text("booking_id").notNull().unique(),
  invoice_number: text("invoice_number").notNull().unique(),
  total: integer("total").notNull(),
  // JSON snapshot of line items + delivery/waiver, so the invoice document
  // stays correct even if the underlying bookings are edited later.
  items_json: text("items_json").notNull().default("[]"),
  issued_at: text("issued_at").notNull(),
});

export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),
  order_id: text("order_id"),
  booking_id: text("booking_id").notNull().unique(),
  origin_address: text("origin_address").notNull(),
  destination_address: text("destination_address").notNull(),
  distance_km: integer("distance_km"),
  duration_minutes: integer("duration_minutes"),
  delivery_fee: integer("delivery_fee").notNull(),
  status: text("status").notNull().default("scheduled"),
});

// Generic key-value store for admin-editable site settings (delivery
// pricing today; room to grow without a schema change).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Editable long-form content blocks (About, Terms & Policies).
export const siteContent = pgTable("site_content", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  updated_at: text("updated_at").notNull(),
});

export const galleryImages = pgTable("gallery_images", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  sort_order: integer("sort_order").notNull().default(0),
});
