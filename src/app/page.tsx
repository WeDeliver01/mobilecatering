import { getAssets } from "@/db/repo";
import { BookingClient } from "@/components/booking/BookingClient";
import { iso, today, addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Page() {
  const assets = (await getAssets()).filter((a) => a.active);
  const t = today();
  return (
    <BookingClient
      assets={assets}
      initialStart={iso(addDays(t, 1))}
      initialEnd={iso(addDays(t, 3))}
      minDate={iso(t)}
    />
  );
}
