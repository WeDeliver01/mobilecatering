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
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  asset_type: text("asset_type").notNull(),
  asset_id: text("asset_id"),
  customer: text("customer").notNull().default(""),
  start_date: text("start_date").notNull(),
  end_date: text("end_date").notNull(),
  days: integer("days").notNull().default(1),
  status: text("status").notNull().default("pending"),
  price_total: integer("price_total").notNull().default(0),
  delivery_address: text("delivery_address").notNull().default(""),
  zone: text("zone").notNull().default(""),
  site_contact: text("site_contact").notNull().default(""),
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

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
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
  booking_id: text("booking_id").notNull().unique(),
  invoice_number: text("invoice_number").notNull().unique(),
  total: integer("total").notNull(),
  issued_at: text("issued_at").notNull(),
});

export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),
  booking_id: text("booking_id").notNull().unique(),
  origin_address: text("origin_address").notNull(),
  destination_address: text("destination_address").notNull(),
  distance_km: integer("distance_km"),
  duration_minutes: integer("duration_minutes"),
  delivery_fee: integer("delivery_fee").notNull(),
  status: text("status").notNull().default("scheduled"),
});
