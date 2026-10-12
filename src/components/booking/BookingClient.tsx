"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Asset, AssetType, AvailabilityResult, Booking } from "@/lib/types";
import { ZONES, WAIVER_FEE, computePrice } from "@/lib/pricing";
import { billedDays, occupiedDays, prettyDate } from "@/lib/dates";
import { ZAR } from "@/lib/format";
import { BrandBar } from "@/components/ui/BrandBar";
import { Icon } from "@/components/ui/Icon";
import { createBookingAction, createQuoteAction, convertQuoteAction, type BookingInput } from "@/app/actions";

const TYPE_META: Record<AssetType, { icon: string; chip: string }> = {
  fridge: { icon: "ac_unit", chip: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
  toilet: { icon: "wc", chip: "bg-secondary-container text-on-secondary-container" },
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
    <div>
      <section className="industrial-grid border-b border-outline-variant/60 bg-surface-bright">
        <div className="max-w-7xl mx-auto px-container-padding py-12 md:py-16 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full font-code-sm text-[11px] text-secondary mb-4"><span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" /> Gauteng logistics engine · live inventory</div>
            <h1 className="font-display-lg text-headline-lg md:text-display-lg text-on-surface max-w-3xl">Commercial mobile assets, <span className="text-secondary">quoted with certainty.</span></h1>
            <p className="mt-4 max-w-2xl font-body-lg text-on-surface-variant">Book mobile cold storage and sanitation with live availability, clear delivery pricing and secure payment verification.</p>
          </div>
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 custom-shadow">
            <div className="flex justify-between text-[11px] uppercase tracking-wider font-label-md text-on-surface-variant"><span>Fleet readiness</span><span className="text-tertiary">Live</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3"><div className="bg-surface-container-low p-3 rounded"><span className="block text-xs text-on-surface-variant">Bookable units</span><strong className="font-headline-md text-xl">{assets.reduce((n, a) => n + a.quantity_available, 0)}</strong></div><div className="bg-surface-container-low p-3 rounded"><span className="block text-xs text-on-surface-variant">Rate engine</span><strong className="font-label-md text-secondary">Ready</strong></div></div>
          </div>
        </div>
      </section>
      <div id="quote-calculator" className="max-w-7xl mx-auto px-container-padding py-stack-lg">
      <div className="flex flex-col md:grid md:grid-cols-12 gap-8 relative">
        {/* Configurator */}
        <div className="md:col-span-8 space-y-stack-lg">
          <header className="mb-2">
            <p className="font-label-md text-secondary uppercase tracking-wider mb-2">Dynamic quote engine</p><h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Configure your mobile hire</h2>
            <p className="text-on-surface-variant font-body-md">
              Configure your hire for an upcoming Gauteng event. Availability is checked live.
            </p>
          </header>

          {/* Step 1 */}
          <section className="space-y-4">
            <StepHead n={1} label="Choose Your Unit" />
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
                    className={`text-left bg-surface-container-low rounded-xl p-6 custom-shadow border-2 transition-all relative overflow-hidden ${
                      on ? "active-tile" : "border-transparent hover:border-outline-variant"
                    }`}
                  >
                    <div className={`absolute top-4 right-4 ${m.chip} px-2 py-1 rounded-md flex items-center gap-1`}>
                      <Icon name={m.icon} className="text-[18px]" />
                    </div>
                    <div className="w-full h-40 bg-surface-variant rounded-lg mb-4 flex items-center justify-center text-outline">
                      <Icon name={m.icon} className="text-6xl" />
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-1">{a.name}</h3>
                    <p className="text-on-surface-variant font-body-md text-sm mb-4">{a.description}</p>
                    <div className="flex justify-between items-end">
                      <span className="font-display-lg text-2xl text-primary">
                        {ZAR(a.daily_rate)}
                        <span className="text-sm font-body-md text-on-surface-variant">/day</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2 */}
          <section className="space-y-4 pt-4">
            <StepHead n={2} label="Select Dates" />
            <div className="bg-surface-container-low rounded-xl p-6 custom-shadow grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <Field label="Delivery Date">
                <div className="relative">
                  <input
                    type="date" value={start} min={minDate}
                    onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }}
                    className="w-full bg-surface-bright border-outline-variant border rounded-lg px-4 py-3 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                  <Icon name="calendar_today" className="absolute right-3 top-3 text-outline pointer-events-none" />
                </div>
              </Field>
              <Field label="Collection Date">
                <div className="relative">
                  <input
                    type="date" value={end} min={start}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full bg-surface-bright border-outline-variant border rounded-lg px-4 py-3 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                  <Icon name="event_repeat" className="absolute right-3 top-3 text-outline pointer-events-none" />
                </div>
              </Field>
              <p className="md:col-span-2 text-xs text-on-surface-variant">
                {days} day{days > 1 ? "s" : ""} on hire (charged per day from delivery to collection).
              </p>
            </div>
          </section>

          {/* Step 3 */}
          <section className="space-y-4 pt-4">
            <StepHead n={3} label="Delivery Details" />
            <div className="bg-surface-container-low rounded-xl p-6 custom-shadow space-y-gutter">
              <Field label="Street Address">
                <input
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 152 Jan Smuts Ave, Rosebank"
                  className="w-full bg-surface-bright border-outline-variant border rounded-lg px-4 py-3 focus:ring-primary focus:border-primary transition-all font-body-md"
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <Field label="Delivery Zone">
                  <select
                    value={zoneId} onChange={(e) => setZoneId(e.target.value)}
                    className="w-full bg-surface-bright border-outline-variant border rounded-lg px-4 py-3 focus:ring-primary focus:border-primary transition-all font-body-md"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{z.name} - {z.detail} ({ZAR(z.fee)})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Site Contact Person">
                  <input
                    type="text" value={siteContact} onChange={(e) => setSiteContact(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-surface-bright border-outline-variant border rounded-lg px-4 py-3 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
              </div>
              <Field label="Booking Name / Customer">
                <input
                  type="text" value={customer} onChange={(e) => setCustomer(e.target.value)}
                  placeholder="e.g. Mokoena Family Event"
                  className="w-full bg-surface-bright border-outline-variant border rounded-lg px-4 py-3 focus:ring-primary focus:border-primary transition-all font-body-md"
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

        {/* Sticky Quote Panel */}
        <div className="md:col-span-4">
          <aside className="sticky top-28 space-y-6">
            <div className="bg-surface-container-low rounded-xl overflow-hidden custom-shadow border border-outline-variant">
              <BrandBar />
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline-md text-headline-md">Quote Summary</h3>
                  <AvailBadge status={status} minFree={avail?.minFree} />
                </div>

                {/* Capacity strip */}
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-[11px]">
                    Unit Availability Window
                  </label>
                  <div className="flex items-end justify-between gap-1 h-12 bg-surface-bright rounded-lg px-2 py-1">
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
                            !known ? "bg-surface-container-high" : full ? "bg-error/50" : "bg-tertiary-container"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-outline font-label-md">
                    <span>{prettyDate(start).toUpperCase()}</span>
                    <span>{prettyDate(end).toUpperCase()}</span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 pt-2">
                  <Line label={`${asset?.name ?? "Unit"} (${days} day${days > 1 ? "s" : ""})`} value={ZAR(price.base)} />
                  <Line label="Delivery & Setup" value={ZAR(price.delivery)} />
                  {waiver && <Line label="Damage Waiver" value={ZAR(price.waiver)} />}
                  <div className="border-t border-outline-variant pt-3 flex justify-between items-center">
                    <span className="font-headline-md text-headline-md">Total</span>
                    <span className="font-display-lg text-3xl text-primary">{ZAR(price.total)}</span>
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
                    className="w-full bg-tangerine text-on-background py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {status === "unavailable" ? "Unavailable for these dates" : submitting ? "Working..." : "Reserve & request payment"}
                  </button>
                  <button
                    type="button" onClick={onSave} disabled={submitting}
                    className="w-full border-2 border-on-background text-on-background py-3 rounded-lg font-bold text-body-md hover:bg-surface-variant transition-all active:scale-95 disabled:opacity-40"
                  >
                    Save quote and decide later
                  </button>
                </div>
              </div>
            </div>

            {/* Help box */}
            <div className="bg-tertiary-container text-white p-6 rounded-xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <Icon name="support_agent" className="text-[100px]" fill />
              </div>
              <h4 className="font-headline-md text-white mb-2">Need Help?</h4>
              <p className="text-on-tertiary-container text-sm leading-relaxed mb-4">
                Our team can plan custom logistics for your Gauteng event.
              </p>
              <a className="inline-flex items-center gap-2 font-bold hover:underline" href="tel:+27115550123">
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

function StepHead({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold font-display-lg text-lg">{n}</span>
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
      <div className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
        <span className="w-2 h-2 rounded-full bg-outline animate-pulse" /> Checking
      </div>
    );
  }
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    available: { cls: "bg-tertiary/10 text-tertiary", dot: "bg-tertiary", label: "Available" },
    limited: { cls: "bg-secondary-container/20 text-secondary", dot: "bg-secondary", label: minFree != null ? `Limited (${minFree})` : "Limited" },
    unavailable: { cls: "bg-error/10 text-error", dot: "bg-error", label: "Fully booked" },
  };
  const v = map[status];
  return (
    <div className={`${v.cls} px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold`}>
      <span className={`w-2 h-2 rounded-full ${v.dot} ${status === "available" ? "animate-pulse" : ""}`} />
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(38,32,26,0.5)]" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden w-full max-w-md custom-shadow" onClick={(e) => e.stopPropagation()}>
        <BrandBar />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${isQuote ? "bg-secondary-container/30 text-secondary" : "bg-tertiary/15 text-tertiary"}`}>
              <Icon name={isQuote ? "receipt_long" : "check_circle"} fill />
            </span>
            <div>
              <h3 className="font-headline-md text-headline-md">{isQuote ? "Quote saved" : "Payment request created"}</h3>
              <p className="text-xs text-on-surface-variant">
                {isQuote ? "Reopen any time before it expires." : "Your dates are held while payment is verified."}
              </p>
            </div>
          </div>

          <div className="bg-surface-bright border border-outline-variant rounded-xl p-4">
            <p className="text-xs text-on-surface-variant uppercase font-label-md">{isQuote ? "Quote reference" : "Payment reference"}</p>
            <p className="font-code-sm text-2xl font-bold text-primary tracking-widest">
              {isQuote ? modal.code : modal.paymentReference ?? modal.booking.id.slice(0, 8).toUpperCase()}
            </p>
            {isQuote && <p className="text-[11px] text-outline mt-1">Valid until {prettyDate(modal.expires)}</p>}
          </div>

          <div className="flex gap-2">
            {isQuote ? (
              <>
                <button
                  type="button" disabled={submitting} onClick={() => onConvert(modal.code)}
                  className="flex-1 bg-tangerine text-on-background py-3 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  Convert to booking
                </button>
                <button type="button" onClick={onClose} className="px-4 border-2 border-on-background rounded-lg font-bold hover:bg-surface-variant transition-all">
                  Close
                </button>
              </>
            ) : (
              <>
                <Link href="/admin" className="flex-1 text-center bg-tangerine text-on-background py-3 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all">
                  View in admin
                </Link>
                <button type="button" onClick={onClose} className="px-4 border-2 border-on-background rounded-lg font-bold hover:bg-surface-variant transition-all">
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
