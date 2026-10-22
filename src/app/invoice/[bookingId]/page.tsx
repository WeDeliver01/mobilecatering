import { notFound } from "next/navigation";
import { getBookingById, getInvoiceByBookingId } from "@/db/repo";
import { ZAR } from "@/lib/format";
import { prettyDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: { bookingId: string } }) {
  const [booking, invoice] = await Promise.all([getBookingById(params.bookingId), getInvoiceByBookingId(params.bookingId)]);
  if (!booking || !invoice) notFound();
  return (
    <main className="max-w-2xl mx-auto px-container-padding py-stack-lg">
      <article className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 space-y-8">
        <header className="flex justify-between items-start border-b border-outline-variant pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 font-headline-md text-lg text-on-surface font-extrabold">
              <span className="w-[30px] h-[30px] rounded-lg bg-primary text-on-primary grid place-items-center text-sm font-extrabold">M</span>
              MOSSANNAH
            </div>
            <p className="text-sm text-on-surface-variant">Mobile fridge &amp; toilet hire</p>
          </div>
          <div className="text-right flex flex-col gap-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tax invoice</p>
            <p className="font-code-sm text-sm font-bold">{invoice.invoice_number}</p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Billed to</p>
            <p className="font-label-md text-on-surface">{booking.customer}</p>
            <p className="text-on-surface-variant text-sm">{booking.delivery_address}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Hire period</p>
            <p className="font-label-md text-on-surface">{prettyDate(booking.start_date)} – {prettyDate(booking.end_date)}</p>
            <p className="text-on-surface-variant text-sm">{booking.days} day{booking.days === 1 ? "" : "s"} on hire</p>
          </div>
        </div>
        <div className="border-y border-outline-variant py-4 flex justify-between">
          <span>{booking.asset_type === "fridge" ? "Mobile Fridge hire" : "Double Toilet hire"}</span>
          <span className="font-label-md font-bold">{ZAR(invoice.total)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xl font-headline-md">Total paid</span>
          <span className="text-2xl font-display-lg text-on-surface">{ZAR(invoice.total)}</span>
        </div>
        <p className="text-xs text-on-surface-variant">Issued {new Date(invoice.issued_at).toLocaleDateString("en-ZA")}. This invoice is generated after payment verification.</p>
        <p className="print:hidden text-sm text-on-surface-variant">Use your browser’s Print command to save this invoice as a PDF.</p>
      </article>
    </main>
  );
}
