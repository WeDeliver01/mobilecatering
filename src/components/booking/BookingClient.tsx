"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Asset, AssetType, AvailabilityResult, Booking } from "@/lib/types";
import { ZONES, WAIVER_FEE, computePrice } from "@/lib/pricing";
import { billedDays, occupiedDays, prettyDate } from "@/lib/dates";
import { ZAR } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { createBookingAction, createQuoteAction, convertQuoteAction, type BookingInput } from "@/app/actions";

const TYPE_META: Record<AssetType, { icon: string }> = {
  fridge: { icon: "ac_unit" },
  toilet: { icon: "wc" },
};

type Modal =
  | { kind: "booking"; booking: Booking; paymentReference?: string }
  | { kind: "quote"; code: string; expires: string }
  | null;

export function BookingClient({
  assets, initialStart, initialEnd, minDate,
}: {
  assets: Asset[];
  initialStart: string;
  initialEnd: string;
  minDate: string;
}) {
  const types = useMemo(
    () => Array.from(new Set(assets.map((a) => a.type))) as AssetType[],
    [assets]
  );
  const firstAssetOfType = (t: AssetType) => assets.find((a) => a.type === t);

  const [type, setType] = useState<AssetType>(types[0] ?? "fridge");
  const [assetId, setAssetId] = useState<string>(firstAssetOfType(types[0] ?? "fridge")?.id ?? "");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [waiver, setWaiver] = useState(true);
  const [address, setAddress] = useState("");
  const [siteContact, setSiteContact] = useState("");
  const [customer, setCustomer] = useState("");

  const [avail, setAvail] = useState<AvailabilityResult | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const asset = assets.find((a) => a.id === assetId) ?? firstAssetOfType(type) ?? assets[0];

  useEffect(() => {
    const a = firstAssetOfType(type);
    if (a && a.id !== assetId && !assets.find((x) => x.id === assetId && x.type === type)) {
      setAssetId(a.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    let cancel = false;
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/availability?type=${type}&start=${start}&end=${end}`, { cache: "no-store" });
        const data = (await r.json()) as AvailabilityResult;
        if (!cancel) setAvail(data);
      } catch {
        if (!cancel) setAvail(null);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(id); };
  }, [type, start, end]);

  const days = billedDays(start, end);
  const price = computePrice({ asset: { daily_rate: asset?.daily_rate ?? 0 }, days, zoneId, waiver });
  const status = avail?.status ?? null;

  const payload = (): BookingInput => ({
    assetType: type, assetId: asset?.id ?? "", start, end, zoneId, waiver, address, siteContact, customer,
  });

  const onConfirm = async () => {
    setSubmitting(true); setError(null);
    const res = await createBookingAction(payload());
    setSubmitting(false);
    if (res.ok) setModal({ kind: "booking", booking: res.booking, paymentReference: res.paymentReference });
    else setError(res.error);
  };
  const onSave = async () => {
    setSubmitting(true); setError(null);
    const res = await createQuoteAction(payload());
    setSubmitting(false);
    if (res.ok) setModal({ kind: "quote", code: res.code, expires: res.expires_at });
    else setError(res.error);
  };
  const onConvert = async (code: string) => {
    setSubmitting(true); setError(null);
    const res = await convertQuoteAction(code);
    setSubmitting(false);
    if (res.ok) setModal({ kind: "booking", booking: res.booking, paymentReference: res.paymentReference });
    else setError(res.error);
  };

  const placeholderDays = occupiedDays(start, end);
  const cap = avail?.capacity ?? 0;

  return (
    <div id="top">
      {/* Hero */}
      <section className="border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-container-padding py-14 md:py-20 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 flex flex-col gap-5">
            <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface max-w-2xl">
              Mobile fridges &amp; toilets, delivered anywhere in Gauteng.
            </h1>
            <p className="max-w-xl font-body-lg text-on-surface-variant">
              Pick a unit, choose your dates, and we deliver, set up and collect — fixed pricing, no surprises on the day.
            </p>
            <div className="flex flex-wrap gap-5 text-sm text-on-surface-variant font-medium">
              <Check label="Delivery & collection included" />
              <Check label="Fixed daily pricing" />
              <Check label="Across Gauteng" />
            </div>
          </div>
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <div className="flex justify-between text-[11px] uppercase tracking-wider font-label-md text-on-surface-variant">
              <span>Fleet readiness</span><span className="text-tertiary">Live</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low p-3 rounded-lg">
                <span className="block text-xs text-on-surface-variant">Bookable units</span>
                <strong className="font-headline-md text-xl">{assets.reduce((n, a) => n + a.quantity_available, 0)}</strong>
              </div>
              <div className="bg-surface-container-low p-3 rounded-lg">
                <span className="block text-xs text-on-surface-variant">Rate engine</span>
                <strong className="font-label-md text-on-surface">Ready</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="quote-calculator" className="max-w-7xl mx-auto px-container-padding py-stack-lg">
        <div className="flex flex-col md:grid md:grid-cols-12 gap-8 relative">
          {/* Configurator */}
          <div className="md:col-span-8 space-y-stack-lg">
            <header className="mb-2">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Check availability</h2>
              <p className="text-on-surface-variant font-body-md">
                Configure your hire for an upcoming Gauteng event. Availability is checked live.
              </p>
            </header>

            {/* Step 1 */}
            <section className="space-y-4">
              <StepHead n={1} label="Choose your unit" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {types.map((t) => {
                  const a = firstAssetOfType(t);
                  if (!a) return null;
                  const m = TYPE_META[t];
                  const on = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`text-left bg-surface-container-lowest rounded-xl p-5 border-2 transition-all ${
                        on ? "active-tile" : "border-outline-variant hover:border-on-surface-variant"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface">
                          <Icon name={m.icon} className="text-xl" />
                        </span>
                      </div>
                      <h3 className="font-headline-md text-headline-md mb-1">{a.name}</h3>
                      <p className="text-on-surface-variant font-body-md text-sm mb-4">{a.description}</p>
                      <span className="font-headline-lg text-xl text-on-surface">
                        {ZAR(a.daily_rate)}
                        <span className="text-sm font-body-md text-on-surface-variant"> / day</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2 */}
            <section className="space-y-4 pt-4">
              <StepHead n={2} label="Select dates" />
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <Field label="Delivery date">
                  <input
                    type="date" value={start} min={minDate}
                    onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }}
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
                <Field label="Collection date">
                  <input
                    type="date" value={end} min={start}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
                <p className="md:col-span-2 text-xs text-on-surface-variant">
                  {days} day{days > 1 ? "s" : ""} on hire (charged per day from delivery to collection).
                </p>
              </div>
            </section>

            {/* Step 3 */}
            <section className="space-y-4 pt-4">
              <StepHead n={3} label="Delivery details" />
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-gutter">
                <Field label="Street address">
                  <input
                    type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 152 Jan Smuts Ave, Rosebank"
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                  <Field label="Delivery zone">
                    <select
                      value={zoneId} onChange={(e) => setZoneId(e.target.value)}
                      className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                    >
                      {ZONES.map((z) => (
                        <option key={z.id} value={z.id}>{z.name} - {z.detail} ({ZAR(z.fee)})</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Site contact person">
                    <input
                      type="text" value={siteContact} onChange={(e) => setSiteContact(e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                    />
                  </Field>
                </div>
                <Field label="Booking name / customer">
                  <input
                    type="text" value={customer} onChange={(e) => setCustomer(e.target.value)}
                    placeholder="e.g. Mokoena Family Event"
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="font-label-md text-label-md">Damage waiver</p>
                    <p className="text-xs text-on-surface-variant">Covers accidental damage on site. {ZAR(WAIVER_FEE)} flat.</p>
                  </div>
                  <button
                    type="button" onClick={() => setWaiver((w) => !w)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${waiver ? "bg-tertiary" : "bg-outline-variant"}`}
                    aria-pressed={waiver}
                  >
                    <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${waiver ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Sticky quote panel */}
          <div className="md:col-span-4">
            <aside className="sticky top-28 space-y-6">
              <div id="book" className="bg-surface-container-lowest rounded-xl border border-outline-variant">
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-headline-md text-headline-md">Quote summary</h3>
                    <AvailBadge status={status} minFree={avail?.minFree} />
                  </div>

                  {/* Capacity strip */}
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-[11px]">
                      Unit availability window
                    </label>
                    <div className="flex items-end justify-between gap-1 h-12 bg-surface-container-low rounded-lg px-2 py-1">
                      {(avail?.days ?? placeholderDays.map((d) => ({ date: d, free: -1 }))).map((d) => {
                        const known = d.free >= 0;
                        const full = known && d.free <= 0;
                        const h = !known ? 55 : cap ? Math.max(14, Math.round((d.free / cap) * 100)) : 55;
                        return (
                          <div
                            key={d.date}
                            title={known ? `${prettyDate(d.date)}: ${d.free} free` : prettyDate(d.date)}
                            style={{ height: `${h}%` }}
                            className={`w-full rounded-sm ${
                              !known ? "bg-surface-container-high" : full ? "bg-error/50" : "bg-tertiary"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-on-surface-variant font-label-md">
                      <span>{prettyDate(start).toUpperCase()}</span>
                      <span>{prettyDate(end).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-3 pt-2">
                    <Line label={`${asset?.name ?? "Unit"} (${days} day${days > 1 ? "s" : ""})`} value={ZAR(price.base)} />
                    <Line label="Delivery & setup" value={ZAR(price.delivery)} />
                    {waiver && <Line label="Damage waiver" value={ZAR(price.waiver)} />}
                    <div className="border-t border-outline-variant pt-3 flex justify-between items-center">
                      <span className="font-headline-md text-headline-md">Total</span>
                      <span className="font-display-lg text-2xl text-on-surface">{ZAR(price.total)}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-error-container text-on-error-container text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <Icon name="error" className="text-[18px]" /> {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="button" onClick={onConfirm}
                      disabled={submitting || status === "unavailable" || !avail}
                      className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-base hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {status === "unavailable" ? "Unavailable for these dates" : submitting ? "Working..." : "Check availability & price"}
                    </button>
                    <button
                      type="button" onClick={onSave} disabled={submitting}
                      className="w-full border border-outline text-on-surface py-3 rounded-lg font-bold text-body-md hover:bg-surface-container-low transition-all active:scale-[0.99] disabled:opacity-40"
                    >
                      Save quote and decide later
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant text-center">No payment required until you confirm.</p>
                </div>
              </div>

              {/* Help box */}
              <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
                <h4 className="font-headline-md text-on-surface mb-2">Need help?</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                  Our team can plan custom logistics for your Gauteng event.
                </p>
                <a className="inline-flex items-center gap-2 font-bold text-on-surface hover:underline" href="tel:+27115550123">
                  <Icon name="call" className="text-sm" /> +27 (0)11 555 0123
                </a>
              </div>
            </aside>
          </div>
        </div>

        {modal && (
          <ResultModal
            modal={modal}
            asset={asset}
            onClose={() => setModal(null)}
            onConvert={onConvert}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5L6.2 11.5L13 4.5" stroke="#15171A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

function StepHead({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">{n}</span>
      <h2 className="font-headline-md text-headline-md text-on-surface">{label}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-body-md text-on-surface-variant">
      <span>{label}</span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}

function AvailBadge({ status, minFree }: { status: string | null; minFree?: number }) {
  if (!status) {
    return (
      <div className="bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
        <span className="w-2 h-2 rounded-full bg-outline" /> Checking
      </div>
    );
  }
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    available: { cls: "bg-tertiary-container text-tertiary", dot: "bg-tertiary", label: "Available" },
    limited: { cls: "bg-secondary-container text-secondary", dot: "bg-secondary", label: minFree != null ? `Limited (${minFree})` : "Limited" },
    unavailable: { cls: "bg-error-container text-error", dot: "bg-error", label: "Fully booked" },
  };
  const v = map[status];
  return (
    <div className={`${v.cls} px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold`}>
      <span className={`w-2 h-2 rounded-full ${v.dot}`} />
      {v.label}
    </div>
  );
}

function ResultModal({
  modal, asset, onClose, onConvert, submitting,
}: {
  modal: Exclude<Modal, null>;
  asset: Asset | undefined;
  onClose: () => void;
  onConvert: (code: string) => void;
  submitting: boolean;
}) {
  const isQuote = modal.kind === "quote";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(21,23,26,0.5)]" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden w-full max-w-md border border-outline-variant" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${isQuote ? "bg-secondary-container text-secondary" : "bg-tertiary-container text-tertiary"}`}>
              <Icon name={isQuote ? "receipt_long" : "check_circle"} fill />
            </span>
            <div>
              <h3 className="font-headline-md text-headline-md">{isQuote ? "Quote saved" : "Payment request created"}</h3>
              <p className="text-xs text-on-surface-variant">
                {isQuote ? "Reopen any time before it expires." : "Your dates are held while payment is verified."}
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
            <p className="text-xs text-on-surface-variant uppercase font-label-md">{isQuote ? "Quote reference" : "Payment reference"}</p>
            <p className="font-code-sm text-2xl font-bold text-on-surface tracking-widest">
              {isQuote ? modal.code : modal.paymentReference ?? modal.booking.id.slice(0, 8).toUpperCase()}
            </p>
            {isQuote && <p className="text-[11px] text-on-surface-variant mt-1">Valid until {prettyDate(modal.expires)}</p>}
          </div>

          <div className="flex gap-2">
            {isQuote ? (
              <>
                <button
                  type="button" disabled={submitting} onClick={() => onConvert(modal.code)}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"
                >
                  Convert to booking
                </button>
                <button type="button" onClick={onClose} className="px-4 border border-outline rounded-lg font-bold hover:bg-surface-container-low transition-all">
                  Close
                </button>
              </>
            ) : (
              <>
                <Link href="/admin" className="flex-1 text-center bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-90 active:scale-[0.99] transition-all">
                  View in admin
                </Link>
                <button type="button" onClick={onClose} className="px-4 border border-outline rounded-lg font-bold hover:bg-surface-container-low transition-all">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
