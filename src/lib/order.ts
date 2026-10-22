import type { Booking, Payment, BookingStatus } from "./types";

// Groups booking rows (one per hired item) back into orders for display.
// Pure and isomorphic (no DB access) so both server actions and the admin
// client components can use the same grouping logic.
export interface Order {
  orderId: string;
  bookings: Booking[];
  customer: string;
  start_date: string;
  end_date: string;
  days: number;
  status: BookingStatus;
  delivery_address: string;
  zone: string;
  site_contact: string;
  created_at: string;
  total: number;
}

export function orderKey(b: Pick<Booking, "id" | "order_id">): string {
  return b.order_id ?? b.id;
}

export function groupOrders(bookings: Booking[], payments: Payment[]): Order[] {
  const byOrder = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = orderKey(b);
    const list = byOrder.get(key);
    if (list) list.push(b);
    else byOrder.set(key, [b]);
  }

  const paymentByOrder = new Map<string, Payment>();
  for (const p of payments) {
    const key = p.order_id ?? p.booking_id;
    if (!paymentByOrder.has(key)) paymentByOrder.set(key, p);
  }

  return Array.from(byOrder.entries()).map(([orderId, items]) => {
    const first = items[0];
    const total = paymentByOrder.get(orderId)?.amount ?? items.reduce((s, b) => s + b.price_total, 0);
    return {
      orderId,
      bookings: items,
      customer: first.customer,
      start_date: first.start_date,
      end_date: first.end_date,
      days: first.days,
      status: first.status,
      delivery_address: first.delivery_address,
      zone: first.zone,
      site_contact: first.site_contact,
      created_at: first.created_at,
      total,
    };
  });
}
