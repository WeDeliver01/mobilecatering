import { getAssets, getPricingSettings, getSiteContent } from "@/db/repo";
import { BookingClient } from "@/components/booking/BookingClient";
import { iso, today, addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [assets, pricing, terms] = await Promise.all([
    getAssets().then((a) => a.filter((x) => x.active)),
    getPricingSettings(),
    getSiteContent("terms"),
  ]);
  const t = today();
  return (
    <BookingClient
      assets={assets}
      pricing={pricing}
      initialStart={iso(addDays(t, 1))}
      initialEnd={iso(addDays(t, 3))}
      minDate={iso(t)}
      termsTitle={terms?.title || "Terms & Policies"}
      termsBody={terms?.body || ""}
    />
  );
}
