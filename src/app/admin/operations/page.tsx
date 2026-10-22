import Link from "next/link";
import { getBookings, getDeliveries, getInvoices, getPayments } from "@/db/repo";
import { ZAR } from "@/lib/format";
import { prettyDate } from "@/lib/dates";
import { StatusPill } from "@/components/ui/StatusPill";
import { AdminLogoutButton } from "@/components/ui/AdminLogoutButton";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [bookings, payments, invoices, deliveries] = await Promise.all([
    getBookings(), getPayments(), getInvoices(), getDeliveries(),
  ]);
  const booking = (id: string) => bookings.find((b) => b.id === id);
  return (
    <div className="max-w-7xl mx-auto w-full px-container-padding py-stack-lg space-y-stack-lg">
      <header className="flex justify-between items-start"><div><p className="font-label-md text-on-surface-variant uppercase tracking-widest text-xs">Super admin</p><h1 className="font-headline-lg text-headline-lg">Operations</h1><p className="text-on-surface-variant">Payments, invoices and delivery dispatch in one place.</p></div><AdminLogoutButton /></header>
      <Section title="Payments" empty="No payment requests yet.">
        {payments.map((p) => <tr key={p.id}><Td>{p.reference}</Td><Td>{booking(p.booking_id)?.customer ?? "-"}</Td><Td>{ZAR(p.amount)}</Td><Td><StatusPill status={p.status} /></Td></tr>)}
      </Section>
      <Section title="Delivery schedule" empty="No deliveries scheduled yet.">
        {deliveries.map((d) => <tr key={d.id}><Td>{prettyDate(booking(d.booking_id)?.start_date ?? "")}</Td><Td>{booking(d.booking_id)?.customer ?? "-"}</Td><Td>{d.destination_address}</Td><Td>{ZAR(d.delivery_fee)}</Td><Td><StatusPill status={d.status} /></Td></tr>)}
      </Section>
      <Section title="Invoices" empty="Invoices are created only after payment confirmation.">
        {invoices.map((i) => <tr key={i.id}><Td>{i.invoice_number}</Td><Td>{booking(i.booking_id)?.customer ?? "-"}</Td><Td>{ZAR(i.total)}</Td><Td><Link className="text-primary font-label-md hover:underline" href={`/invoice/${i.booking_id}`}>View invoice</Link></Td></tr>)}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children : [children];
  return <section className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-x-auto"><h2 className="p-stack-md font-headline-md text-headline-md border-b border-outline-variant">{title}</h2><table className="w-full text-left"><tbody className="divide-y divide-outline-variant/60">{rows.length ? rows : <tr><Td>{empty}</Td></tr>}</tbody></table></section>;
}
function Td({ children }: { children: React.ReactNode }) { return <td className="px-6 py-4 font-body-md whitespace-nowrap">{children}</td>; }
