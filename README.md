# MOSSANNAH - Booking & Operations

A booking and operations web app for MOSSANNAH (mobile fridge and double toilet hire across Gauteng).
It runs fully on your machine with no external accounts, then ports to hosting with a single driver swap.

## What runs

- Customer booking screen (`/`): pick a unit, choose dates, enter delivery details, see a live availability
  check and price, then create a payment request or save a shareable quote.
- Admin dashboard (`/admin`): overview stats, next deliveries, fleet utilisation, a searchable and
  filterable booking register with status controls, and an asset manager with editable rates and counts.
- Operations (`/admin/operations`): payment requests, delivery schedule, and post-payment invoices.
- Quote reopen (`/quote/<CODE>`): open a saved quote and convert it to a booking.

The availability engine, pricing, quotes, and admin edits are all real and backed by a database.

## Payment handoff

A booking is held as `pending` and can only be moved to `reserved` by the server-side payment webhook.
Set `PAYFAST_WEBHOOK_TOKEN` on the host and have the PayFast notification adapter send it as the
`x-webhook-token` header when POSTing `{ "reference": "MZ-…", "payment_status": "COMPLETE" }` to
`/api/payments/webhook`. The webhook creates the invoice idempotently. Do not treat a browser return
from a payment page as proof of payment.

## Requirements

- Node.js 18.18+ (Node 20 or 22 recommended)
- npm

No compiler, Docker, or cloud account needed. The local database is PGlite, an embedded Postgres that
ships as a normal npm package and stores its data in `./data/pg`.

## Run it

```bash
cd mossannah
npm install
npm run dev
```

Then open http://localhost:3000

On first run the database creates its tables and seeds the real fleet (one fridge, one double toilet)
plus a few sample bookings so the screens are populated. To wipe and reseed at any time:

```bash
npm run db:reset
```

Production build (optional):

```bash
npm run build
npm run start
```

## Things to know (and where to change them)

- Rates are placeholders: fridge R1,250/day, toilet R950/day. Edit them live in Admin > Assets, or change
  the seed in `src/db/seed-data.ts`.
- The double toilet is one bookable unit. The whole trailer goes out together, so it is a single line of
  inventory, not two.
- Billing is per day from delivery to collection (20 Nov to 23 Nov is 3 days), matching the approved design.
  The unit is treated as physically committed on every day in that window, so it cannot be double booked.
  This rule lives in `src/lib/dates.ts` (`billedDays` and `occupiedDays`).
- Delivery zones and fees, and the damage waiver amount, are in `src/lib/pricing.ts`.
- There is no login yet. Anyone who can reach the app can open `/admin`. Auth comes with hosting (see below).

## Hosting later (Supabase or any Postgres)

The schema is standard Postgres written with Drizzle (`src/db/schema.ts`), so moving off the local engine is
a driver change, not a rewrite:

1. Create a Postgres database (for example a Supabase project) and set `DATABASE_URL`.
2. In `src/db/client.ts`, swap the PGlite client for a Postgres client (for example `postgres` + 
   `drizzle-orm/postgres-js`). The schema, queries, and the rest of the app stay the same.
3. Add authentication (Supabase Auth) and gate `/admin` and the write actions.

See `.env.example` for the variables to fill in.

## Project layout

```
src/
  app/
    page.tsx                 customer booking screen (server) -> BookingClient
    admin/page.tsx           admin dashboard (server) -> AdminTabs
    quote/[code]/page.tsx    quote reopen (server) -> QuoteView
    api/availability/route.ts  live availability check (GET)
    actions.ts               server actions: create booking, save quote, convert, admin edits
    layout.tsx, globals.css  shell, fonts, brand styles
  components/
    booking/                 BookingClient, QuoteView
    admin/                   AdminTabs (overview, bookings, assets)
    ui/                      TopNav, Footer, BrandBar, StatusPill, Icon
  lib/
    availability.ts          availability engine (authoritative)
    pricing.ts               zones, waiver, price calc
    dates.ts                 billed days and occupancy
    quote.ts, format.ts, types.ts
  db/
    schema.ts                Drizzle Postgres schema
    client.ts                embedded Postgres (PGlite) connection + init
    repo.ts                  typed data access
    seed-data.ts, seed.ts    seed + reset
data/                        local database files (gitignored, created on first run)
```

Design tokens (colours, type, the four block brand bar, 18px cards) are ported from the approved Stitch
design into `tailwind.config.ts` and `src/app/globals.css`.
