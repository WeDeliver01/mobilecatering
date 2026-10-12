import { NextRequest, NextResponse } from "next/server";
import { getBookingById, getInvoiceByBookingId, insertInvoice, markPaymentPaid, setBookingStatus } from "@/db/repo";
import { uid } from "@/lib/quote";

export const dynamic = "force-dynamic";

/**
 * Payment confirmation boundary. Configure PayFast to POST its validated
 * server-to-server notification here through a small adapter/proxy that adds
 * PAYFAST_WEBHOOK_TOKEN. Browser redirects are deliberately ignored.
 */
export async function POST(req: NextRequest) {
  const token = process.env.PAYFAST_WEBHOOK_TOKEN;
  if (!token || req.headers.get("x-webhook-token") !== token) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { reference?: string; payment_status?: string } | null;
  if (!body?.reference || body.payment_status !== "COMPLETE") {
    return NextResponse.json({ error: "Invalid payment notification" }, { status: 400 });
  }

  const payment = await markPaymentPaid(body.reference);
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });

  const booking = await getBookingById(payment.booking_id);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  await setBookingStatus(booking.id, "reserved");
  if (!await getInvoiceByBookingId(booking.id)) {
    await insertInvoice({
      id: uid(), booking_id: booking.id,
      invoice_number: `INV-${new Date().getFullYear()}-${booking.id.slice(0, 8).toUpperCase()}`,
      total: booking.price_total, issued_at: new Date().toISOString(),
    });
  }
  return NextResponse.json({ ok: true, booking_id: booking.id });
}
