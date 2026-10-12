import { notFound } from "next/navigation";
import { getBookingById, getInvoiceByBookingId } from "@/db/repo";
import { ZAR } from "@/lib/format";
import { prettyDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: { bookingId: string } }) {
  const [booking, invoice] = await Promise.all([getBookingById(params.bookingId), getInvoiceByBookingId(params.bookingId)]);
  if (!booking || !invoice) notFound();
  return <main className="max-w-2xl mx-auto px-container-padding py-stack-lg"><article className="bg-surface-container-lowest rounded-xl custom-shadow p-8 space-y-8"><header className="flex justify-between border-b border-outline-variant pb-6"><div><p className="font-display-lg text-2xl text-primary font-black">MOSSANNAH</p><p className="text-on-surface-variant">Event logistics hire</p></div><div className="text-right"><p className="font-headline-md">TAX INVOICE</p><p className="font-code-sm text-sm">{invoice.invoice_number}</p></div></header><div className="grid grid-cols-2 gap-6"><div><p className="text-xs uppercase text-on-surface-variant">Billed to</p><p className="font-label-md">{booking.customer}</p><p>{booking.delivery_address}</p></div><div><p className="text-xs uppercase text-on-surface-variant">Hire period</p><p className="font-label-md">{prettyDate(booking.start_date)} – {prettyDate(booking.end_date)}</p><p>{booking.days} day{booking.days === 1 ? "" : "s"} on hire</p></div></div><div className="border-y border-outline-variant py-4 flex justify-between"><span>{booking.asset_type === "fridge" ? "Mobile Fridge hire" : "Double Toilet hire"}</span><span className="font-label-md">{ZAR(invoice.total)}</span></div><div className="flex justify-between text-xl font-headline-md"><span>Total paid</span><span className="text-primary">{ZAR(invoice.total)}</span></div><p className="text-xs text-on-surface-variant">Issued {new Date(invoice.issued_at).toLocaleDateString("en-ZA")}. This invoice is generated after payment verification.</p><p className="print:hidden text-sm text-on-surface-variant">Use your browser’s Print command to save this invoice as a PDF.</p></article></main>;
}
