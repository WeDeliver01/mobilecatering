import {
  getBookingById, getBookingsByOrderId, getDeliveryByOrderId, getInvoiceByOrderId,
  insertInvoice, markPaymentPaid, setOrderStatus, getAssetById, getPaymentByReference,
} from "@/db/repo";
import { uid } from "@/lib/quote";
import { notifyPaymentConfirmed } from "@/lib/notifications/send";
import { assetTypeLabel } from "@/lib/assetTypes";
import type { InvoiceLineItem } from "@/lib/types";

// Shared by every payment confirmation path (gateway webhooks, and the
// admin "mark as paid" action for manual EFT): marks the payment paid,
// promotes the order, raises the invoice once, and emails it. Idempotent -
// safe to call again for the same order (a provider retrying its webhook,
// for instance), since it no-ops once an invoice already exists.
export async function fulfillPayment(reference: string, expectedAmount?: number): Promise<
  | { ok: true; orderId: string }
  | { ok: false; error: string }
> {
  const existing = await getPaymentByReference(reference);
  if (!existing) return { ok: false, error: "Unknown payment reference." };
  if (expectedAmount != null && Math.abs(existing.amount - expectedAmount) > 0.01) {
    return { ok: false, error: `Amount mismatch: expected R${existing.amount}, gateway reported R${expectedAmount}.` };
  }

  const payment = await markPaymentPaid(reference);
  if (!payment) return { ok: false, error: "Unknown payment reference." };

  const booking = await getBookingById(payment.booking_id);
  if (!booking) return { ok: false, error: "Booking not found for this payment." };

  const orderId = payment.order_id ?? booking.order_id ?? booking.id;
  await setOrderStatus(orderId, "reserved");

  if (!(await getInvoiceByOrderId(orderId))) {
    const items = await getBookingsByOrderId(orderId);
    const delivery = await getDeliveryByOrderId(orderId);
    const waiverFee = payment.amount
      - items.reduce((s, b) => s + b.price_total, 0)
      - (delivery?.delivery_fee ?? 0);

    const lines: InvoiceLineItem[] = [];
    for (const b of items) {
      const asset = b.asset_id ? await getAssetById(b.asset_id) : undefined;
      const label = asset?.name ?? `${assetTypeLabel(b.asset_type)} hire`;
      const qty = b.quantity > 1 ? ` x${b.quantity}` : "";
      lines.push({ label: `${label}${qty} (${b.days} day${b.days === 1 ? "" : "s"})`, amount: b.price_total });
    }
    if (delivery) lines.push({ label: "Delivery & collection", amount: delivery.delivery_fee });
    if (waiverFee > 0) lines.push({ label: "Damage waiver", amount: waiverFee });

    const invoiceNumber = `INV-${new Date().getFullYear()}-${orderId.slice(0, 8).toUpperCase()}`;
    await insertInvoice({
      id: uid(), order_id: orderId, booking_id: booking.id,
      invoice_number: invoiceNumber,
      total: payment.amount, items: lines, issued_at: new Date().toISOString(),
    });

    notifyPaymentConfirmed({
      orderId, invoiceNumber, customer: booking.customer, customerEmail: booking.customer_email,
      items: lines, total: payment.amount, bookingIdForInvoiceUrl: booking.id,
    }).catch((e) => console.error("[notify] payment confirmed failed:", e));
  }

  return { ok: true, orderId };
}
