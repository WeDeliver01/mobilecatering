import { sql } from "drizzle-orm";
import { db, getDb, initSchema, ready } from "./client";
import { runSeed } from "./seed-data";

async function main() {
  const reset = process.argv.includes("--reset");
  await getDb(); // boot the embedded Postgres instance

  if (reset) {
    await db.execute(sql`DROP TABLE IF EXISTS quotes`);
    await db.execute(sql`DROP TABLE IF EXISTS bookings`);
    await db.execute(sql`DROP TABLE IF EXISTS assets`);
    await initSchema();
    await runSeed(db);
    console.log("Database reset and seeded -> 1 fridge, 1 double toilet, 5 sample bookings.");
  } else {
    await ready();
    const res = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM assets`)) as unknown as { rows: { c: number }[] };
    const c = Number(res.rows?.[0]?.c ?? 0);
    console.log(c > 0 ? `Database ready (${c} assets). Use "npm run db:reset" to wipe and reseed.` : "Seeded.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
