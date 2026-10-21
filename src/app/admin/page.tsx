import { getAssets, getBookings, getQuotes, expireOldQuotes } from "@/db/repo";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminLogoutButton } from "@/components/ui/AdminLogoutButton";
import { iso, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await expireOldQuotes();
  const [assets, bookings, quotes] = await Promise.all([getAssets(), getBookings(), getQuotes()]);
  return (
    <div>
      <div className="max-w-7xl mx-auto w-full px-container-padding pt-stack-md flex justify-end">
        <AdminLogoutButton />
      </div>
      <AdminTabs assets={assets} bookings={bookings} quotes={quotes} todayIso={iso(today())} />
    </div>
  );
}
