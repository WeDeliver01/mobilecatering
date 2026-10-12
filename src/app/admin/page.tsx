import { getAssets, getBookings, getQuotes, expireOldQuotes } from "@/db/repo";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { iso, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await expireOldQuotes();
  const [assets, bookings, quotes] = await Promise.all([getAssets(), getBookings(), getQuotes()]);
  return <AdminTabs assets={assets} bookings={bookings} quotes={quotes} todayIso={iso(today())} />;
}
