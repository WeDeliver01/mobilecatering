"use client";

import { useState } from "react";
import Link from "next/link";
import type { Quote } from "@/lib/types";
import { ZAR } from "@/lib/format";
import { prettyDate } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { convertQuoteAction, type ConsentInput } from "@/app/actions";
import { TermsConsentModal, type ConsentResult } from "@/components/booking/TermsConsentModal";
import type { PaymentMethod } from "@/lib/payments";

export function QuoteView({
  quote, termsTitle, termsBody, paymentMethods, bank,
}: {
  quote: Quote;
  termsTitle: string;
  termsBody: string;
  paymentMethods: { id: PaymentMethod; label: string }[];
  bank: { bankName: string; bankAccountName: string; bankAccountNumber: string; bankBranchCode: string };
}) {
  const s = quote.snapshot_json;
  const [status, setStatus] = useState(quote.status);
  const [bookingRef, setBookingRef] = useState<string | null>(quote.converted_booking_id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.id ?? "eft");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const convert = async (consentResult: ConsentResult) => {
    const consent: ConsentInput = { ...consentResult, termsTitle, termsBody };
    setBusy(true); setError(null);
    const res = await convertQuoteAction(quote.quote_code, consent, paymentMethod);
    setBusy(false);
    setShowTerms(false);
    if (res.ok) { setStatus("converted"); setBookingRef(res.bookings[0].id); setCheckoutUrl(res.checkoutUrl ?? null); }
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
            {s.items.map((item, i) => (
              <Row key={i} k={i === 0 ? "Units" : ""} v={item.asset_name} />
            ))}
            <Row k="Dates" v={`${prettyDate(s.start_date)} - ${prettyDate(s.end_date)} (${s.days} day${s.days > 1 ? "s" : ""})`} />
            {(s.delivery_time || s.collection_time) && (
              <Row k="Times" v={`${s.delivery_time || "TBC"} delivery, ${s.collection_time || "TBC"} collection`} />
            )}
            {s.event_type && <Row k="Event type" v={s.event_type} />}
            <Row k="Customer" v={s.customer} />
            {s.customer_phone && <Row k="Contact number" v={`${s.customer_phone}${s.customer_whatsapp ? " (WhatsApp)" : ""}`} />}
            {s.customer_email && <Row k="Email" v={s.customer_email} />}
            {s.delivery_address && <Row k="Address" v={s.delivery_address} />}
            {s.billing_address && <Row k="Billing address" v={s.billing_address} />}
            <Row k="Delivery distance" v={s.zone} />
            {s.site_contact && <Row k="Site contact" v={s.site_contact} />}
            <Row k="Damage waiver" v={s.waiver ? `${ZAR(s.waiver_fee)} (on)` : "Not added"} />
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

          {status === "active" && paymentMethods.length > 1 && (
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-[11px]">
                Payment method
              </label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-label-md border transition-all ${
                      paymentMethod === m.id ? "bg-primary text-on-primary border-primary" : "border-outline text-on-surface-variant hover:border-on-surface-variant"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {status === "active" && (
            <button
              onClick={() => setShowTerms(true)} disabled={busy}
              className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-40"
            >
              {busy ? "Working..." : "Convert to booking"}
            </button>
          )}

          {showTerms && (
            <TermsConsentModal
              title={termsTitle}
              body={termsBody}
              onAgree={convert}
              onCancel={() => setShowTerms(false)}
              busy={busy}
            />
          )}

          {status === "converted" && (
            <div className="space-y-3">
              <div className="bg-tertiary-container text-tertiary rounded-lg px-4 py-3 flex items-center gap-2 font-label-md">
                <Icon name="check_circle" fill /> Converted to booking{bookingRef ? ` #${bookingRef.slice(0, 8).toUpperCase()}` : ""}.
              </div>
              {!checkoutUrl && paymentMethod === "eft" && (
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-1 text-sm">
                  <p className="font-label-md text-on-surface mb-1">Pay by bank transfer</p>
                  {bank.bankName && <p><span className="text-on-surface-variant">Bank:</span> {bank.bankName}</p>}
                  {bank.bankAccountName && <p><span className="text-on-surface-variant">Account holder:</span> {bank.bankAccountName}</p>}
                  {bank.bankAccountNumber && <p><span className="text-on-surface-variant">Account number:</span> {bank.bankAccountNumber}</p>}
                  {bank.bankBranchCode && <p><span className="text-on-surface-variant">Branch code:</span> {bank.bankBranchCode}</p>}
                </div>
              )}
              {checkoutUrl && (
                <a
                  href={checkoutUrl} target="_blank" rel="noreferrer"
                  className="block text-center bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-90 active:scale-[0.99] transition-all"
                >
                  Pay now
                </a>
              )}
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
