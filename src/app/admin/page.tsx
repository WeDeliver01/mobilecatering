import { getAssets, getBookings, getQuotes, expireOldQuotes } from "@/db/repo";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminLogoutButton } from "@/components/ui/AdminLogoutButton";
import { iso, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await expireOldQuotes();
  const [assets, bookings, quotes] = await Promise.all([getAssets(), getBookings(), getQuotes()]);
  return (
    <div className="max-w-7xl mx-auto w-full px-container-padding py-stack-lg">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-stack-lg">
        <div className="flex flex-col gap-1">
          <span className="font-label-md text-on-surface-variant uppercase tracking-widest text-xs">Admin</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Overview</h1>
          <p className="text-on-surface-variant text-sm">Bookings, fleet and quotes at a glance.</p>
        </div>
        <AdminLogoutButton />
      </div>
      <AdminTabs assets={assets} bookings={bookings} quotes={quotes} todayIso={iso(today())} />
    </div>
  );
}
