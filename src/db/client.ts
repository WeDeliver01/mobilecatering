import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { runSeed, seedSettings, seedSiteContent } from "./seed-data";
import fs from "node:fs";
import path from "node:path";

const dir = process.env.PGLITE_DIR || "./data/pg";
const parent = path.dirname(dir);
if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

// Reuse a single embedded-Postgres instance across hot reloads in dev.
const g = globalThis as unknown as {
  __mz_pg?: PGlite;
  __mz_db?: PgliteDatabase<typeof schema>;
  __mz_init?: Promise<void>;
};

const client = g.__mz_pg ?? new PGlite(dir);
if (!g.__mz_pg) g.__mz_pg = client;

export const db: PgliteDatabase<typeof schema> = g.__mz_db ?? drizzle(client, { schema });
if (!g.__mz_db) g.__mz_db = db;

export async function initSchema(): Promise<void> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category_code TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    quantity_available INTEGER NOT NULL DEFAULT 1,
    daily_rate INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT
  )`);
  await db.execute(sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_url TEXT`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    asset_type TEXT NOT NULL,
    asset_id TEXT,
    customer TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    delivery_time TEXT NOT NULL DEFAULT '',
    collection_time TEXT NOT NULL DEFAULT '',
    days INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    price_total INTEGER NOT NULL DEFAULT 0,
    delivery_address TEXT NOT NULL DEFAULT '',
    billing_address TEXT NOT NULL DEFAULT '',
    zone TEXT NOT NULL DEFAULT '',
    site_contact TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL DEFAULT '',
    customer_phone TEXT NOT NULL DEFAULT '',
    customer_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    customer_email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_id TEXT`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_time TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collection_time TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_address TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_whatsapp BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    quote_code TEXT NOT NULL UNIQUE,
    snapshot_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TEXT NOT NULL,
    converted_booking_id TEXT,
    created_at TEXT NOT NULL
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bookings_type_dates ON bookings (asset_type, start_date, end_date)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bookings_order ON bookings (order_id)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, order_id TEXT, booking_id TEXT NOT NULL, amount INTEGER NOT NULL,
    gateway TEXT NOT NULL DEFAULT 'payfast', reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', paid_at TEXT, created_at TEXT NOT NULL
  )`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id TEXT`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, order_id TEXT, booking_id TEXT NOT NULL UNIQUE, invoice_number TEXT NOT NULL UNIQUE,
    total INTEGER NOT NULL, items_json TEXT NOT NULL DEFAULT '[]', issued_at TEXT NOT NULL
  )`);
  await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id TEXT`);
  await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items_json TEXT NOT NULL DEFAULT '[]'`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY, order_id TEXT, booking_id TEXT NOT NULL UNIQUE, origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL, distance_km INTEGER, duration_minutes INTEGER,
    delivery_fee INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled'
  )`);
  await db.execute(sql`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS order_id TEXT`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS site_content (
    slug TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY, url TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL,
    customer_name TEXT NOT NULL DEFAULT '', customer_email TEXT NOT NULL DEFAULT '',
    method TEXT NOT NULL DEFAULT 'checkbox', signature_data_url TEXT,
    terms_title TEXT NOT NULL DEFAULT '', terms_body TEXT NOT NULL DEFAULT '',
    agreed_at TEXT NOT NULL
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_consents_order ON consents (order_id)`);
}

export async function ensureSeed(): Promise<void> {
  const res = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM assets`)) as unknown as {
    rows: { c: number }[];
  };
  const count = Number(res.rows?.[0]?.c ?? 0);
  if (count === 0) await runSeed(db);
}

// Separate from ensureSeed so an existing deployment (assets already seeded)
// still picks up the new settings/content defaults after an update.
export async function ensureDefaults(): Promise<void> {
  const settingsCount = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM settings`)) as unknown as {
    rows: { c: number }[];
  };
  if (Number(settingsCount.rows?.[0]?.c ?? 0) === 0) {
    for (const row of seedSettings()) {
      await db.execute(sql`INSERT INTO settings (key, value) VALUES (${row.key}, ${row.value})
        ON CONFLICT (key) DO NOTHING`);
    }
  }
  const contentCount = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM site_content`)) as unknown as {
    rows: { c: number }[];
  };
  if (Number(contentCount.rows?.[0]?.c ?? 0) === 0) {
    for (const row of seedSiteContent()) {
      await db.execute(sql`INSERT INTO site_content (slug, title, body, updated_at)
        VALUES (${row.slug}, ${row.title}, ${row.body}, ${row.updated_at}) ON CONFLICT (slug) DO NOTHING`);
    }
  }
}

export async function ready(): Promise<void> {
  if (!g.__mz_init) {
    g.__mz_init = (async () => {
      await initSchema();
      await ensureSeed();
      await ensureDefaults();
    })();
  }
  return g.__mz_init;
}

export async function getDb(): Promise<PgliteDatabase<typeof schema>> {
  await ready();
  return db;
}
