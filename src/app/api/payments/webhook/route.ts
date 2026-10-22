import { NextRequest, NextResponse } from "next/server";
import {
  getBookingById, getBookingsByOrderId, getDeliveryByOrderId, getInvoiceByOrderId,
  insertInvoice, markPaymentPaid, setOrderStatus, getAssetById,
} from "@/db/repo";
import { uid } from "@/lib/quote";
import type { InvoiceLineItem } from "@/lib/types";

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

  const orderId = payment.order_id ?? booking.order_id ?? booking.id;
  await setOrderStatus(orderId, "reserved");

  if (!await getInvoiceByOrderId(orderId)) {
    const items = await getBookingsByOrderId(orderId);
    const delivery = await getDeliveryByOrderId(orderId);
    const waiverFee = payment.amount
      - items.reduce((s, b) => s + b.price_total, 0)
      - (delivery?.delivery_fee ?? 0);

    const lines: InvoiceLineItem[] = [];
    for (const b of items) {
      const asset = b.asset_id ? await getAssetById(b.asset_id) : undefined;
      const label = asset?.name ?? (b.asset_type === "fridge" ? "Mobile Fridge hire" : "Double Toilet hire");
      lines.push({ label: `${label} (${b.days} day${b.days === 1 ? "" : "s"})`, amount: b.price_total });
    }
    if (delivery) lines.push({ label: "Delivery & collection", amount: delivery.delivery_fee });
    if (waiverFee > 0) lines.push({ label: "Damage waiver", amount: waiverFee });

    await insertInvoice({
      id: uid(), order_id: orderId, booking_id: booking.id,
      invoice_number: `INV-${new Date().getFullYear()}-${orderId.slice(0, 8).toUpperCase()}`,
      total: payment.amount, items: lines, issued_at: new Date().toISOString(),
    });
  }
  return NextResponse.json({ ok: true, order_id: orderId });
}
