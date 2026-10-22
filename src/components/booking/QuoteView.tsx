"use client";

import { useState } from "react";
import Link from "next/link";
import type { Quote } from "@/lib/types";
import { ZAR } from "@/lib/format";
import { prettyDate } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { convertQuoteAction } from "@/app/actions";

export function QuoteView({ quote, waiverFee }: { quote: Quote; waiverFee: number }) {
  const s = quote.snapshot_json;
  const [status, setStatus] = useState(quote.status);
  const [bookingRef, setBookingRef] = useState<string | null>(quote.converted_booking_id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const convert = async () => {
    setBusy(true); setError(null);
    const res = await convertQuoteAction(quote.quote_code);
    setBusy(false);
    if (res.ok) { setStatus("converted"); setBookingRef(res.booking.id); }
    else setError(res.error);
  };

  return (
    <div className="max-w-xl mx-auto px-container-padding py-stack-lg space-y-6">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Saved Quote</p>
              <p className="font-code-sm text-2xl font-bold text-primary tracking-widest">{quote.quote_code}</p>
            </div>
            <StatusPill status={status} />
          </div>

          <div className="space-y-3">
            <Row k="Unit" v={s.asset_name} />
            <Row k="Dates" v={`${prettyDate(s.start_date)} - ${prettyDate(s.end_date)} (${s.days} day${s.days > 1 ? "s" : ""})`} />
            <Row k="Customer" v={s.customer} />
            {s.delivery_address && <Row k="Address" v={s.delivery_address} />}
            <Row k="Delivery distance" v={s.zone} />
            {s.site_contact && <Row k="Site contact" v={s.site_contact} />}
            <Row k="Damage waiver" v={s.waiver ? `${ZAR(waiverFee)} (on)` : "Not added"} />
          </div>

          <div className="border-t border-outline-variant pt-4 flex justify-between items-center">
            <span className="font-headline-md text-headline-md">Total</span>
            <span className="font-display-lg text-2xl text-on-surface">{ZAR(s.price_total)}</span>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container text-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <Icon name="error" className="text-[18px]" /> {error}
            </div>
          )}

          {status === "active" && (
            <button
              onClick={convert} disabled={busy}
              className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-40"
            >
              {busy ? "Working..." : "Convert to booking"}
            </button>
          )}

          {status === "converted" && (
            <div className="bg-tertiary-container text-tertiary rounded-lg px-4 py-3 flex items-center gap-2 font-label-md">
              <Icon name="check_circle" fill /> Converted to booking{bookingRef ? ` #${bookingRef.slice(0, 8).toUpperCase()}` : ""}.
            </div>
          )}

          {status === "expired" && (
            <div className="bg-surface-container-low text-on-surface-variant rounded-lg px-4 py-3 text-sm">
              This quote has expired. Prices and availability may have changed, so please start a new booking.
            </div>
          )}
        </div>
      </div>

      <Link href="/" className="inline-flex items-center gap-2 text-on-surface font-label-md hover:underline">
        <Icon name="arrow_back" className="text-[18px]" /> Back to booking
      </Link>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-body-md">
      <span className="text-on-surface-variant">{k}</span>
      <span className="font-label-md text-on-surface text-right">{v}</span>
    </div>
  );
}
