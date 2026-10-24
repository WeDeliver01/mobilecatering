"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Asset, AssetType, AvailabilityResult, AvailabilityVerdict, Booking } from "@/lib/types";
import { EVENT_TYPES } from "@/lib/types";
import type { PricingSettings } from "@/lib/pricing";
import { computePrice, deliveryFeeForDistance } from "@/lib/pricing";
import { DEPOT, haversineKm } from "@/lib/geo";
import { billedDays, prettyDate } from "@/lib/dates";
import { ZAR } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { AddressAutocomplete } from "@/components/booking/AddressAutocomplete";
import type { AddressSuggestion } from "@/app/api/geocode/autocomplete/route";
import { createBookingAction, createQuoteAction, convertQuoteAction, type BookingInput, type ConsentInput } from "@/app/actions";
import { TermsConsentModal, type ConsentResult } from "@/components/booking/TermsConsentModal";
import { DatePicker, type CalendarDayInfo } from "@/components/booking/DatePicker";
import type { PaymentMethod } from "@/lib/payments";
import { ASSET_TYPE_META, isQuantityCapable } from "@/lib/assetTypes";

type Modal =
  | { kind: "booking"; bookings: Booking[]; paymentReference: string; paymentMethod: PaymentMethod; checkoutUrl: string | null }
  | { kind: "quote"; code: string; expires: string }
  | null;

export function BookingClient({
  assets, initialStart, initialEnd, minDate, pricing, termsTitle, termsBody, paymentMethods, bank,
}: {
  assets: Asset[];
  initialStart: string;
  initialEnd: string;
  minDate: string;
  pricing: PricingSettings;
  termsTitle: string;
  termsBody: string;
  paymentMethods: { id: PaymentMethod; label: string }[];
  bank: { bankName: string; bankAccountName: string; bankAccountNumber: string; bankBranchCode: string };
}) {
  const types = useMemo(
    () => Array.from(new Set(assets.map((a) => a.type))) as AssetType[],
    [assets]
  );
  const firstAssetOfType = (t: AssetType) => assets.find((a) => a.type === t);

  const [selectedTypes, setSelectedTypes] = useState<AssetType[]>(types[0] ? [types[0]] : []);
  const [quantities, setQuantities] = useState<Partial<Record<AssetType, number>>>({});
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [collectionTime, setCollectionTime] = useState("17:00");
  const [waiver, setWaiver] = useState(true);
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [eventType, setEventType] = useState("");
  const [siteContact, setSiteContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [email, setEmail] = useState("");
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.id ?? "eft");

  const [availByType, setAvailByType] = useState<Record<string, AvailabilityResult | null>>({});
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ kind: "book" } | { kind: "convert"; code: string } | null>(null);

  const selectedAssets = selectedTypes.map((t) => firstAssetOfType(t)).filter((a): a is Asset => !!a);

  const toggleType = (t: AssetType) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    if (isQuantityCapable(t)) {
      setQuantities((prev) => (prev[t] != null ? prev : { ...prev, [t]: 1 }));
    }
  };

  const setQuantity = (t: AssetType, qty: number) => {
    setQuantities((prev) => ({ ...prev, [t]: Math.max(1, Math.floor(qty) || 1) }));
  };

  const quantityFor = (t: AssetType) => (isQuantityCapable(t) ? quantities[t] ?? 1 : 1);

  // Per-day "fully booked" / "limited" map for the date-picker calendars,
  // merged across every currently selected type (the whole order needs all
  // of them on the same dates, so a day unavailable for any one of them is
  // unavailable for the booking). Fetched a month at a time and cached, so
  // flipping between months already seen costs nothing.
  const [calendarByDate, setCalendarByDate] = useState<Record<string, CalendarDayInfo>>({});
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const selectedTypesKey = selectedTypes.join(",");

  useEffect(() => {
    loadedMonthsRef.current = new Set();
    setCalendarByDate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypesKey]);

  const ensureCalendarMonth = (monthStart: string, monthEnd: string) => {
    if (selectedTypes.length === 0) return;
    const key = `${selectedTypesKey}|${monthStart.slice(0, 7)}`;
    if (loadedMonthsRef.current.has(key)) return;
    loadedMonthsRef.current.add(key);
    fetch(`/api/availability/calendar?types=${selectedTypesKey}&start=${monthStart}&end=${monthEnd}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { days: (CalendarDayInfo & { date: string })[] }) => {
        setCalendarByDate((prev) => {
          const next = { ...prev };
          for (const d of data.days) next[d.date] = { fullyBooked: d.fullyBooked, limited: d.limited };
          return next;
        });
      })
      .catch(() => { loadedMonthsRef.current.delete(key); });
  };

  useEffect(() => {
    let cancel = false;
    const id = setTimeout(async () => {
      const entries = await Promise.all(
        selectedTypes.map(async (t) => {
          try {
            const r = await fetch(`/api/availability?type=${t}&start=${start}&end=${end}`, { cache: "no-store" });
            return [t, (await r.json()) as AvailabilityResult] as const;
          } catch {
            return [t, null] as const;
          }
        })
      );
      if (!cancel) setAvailByType(Object.fromEntries(entries));
    }, 250);
    return () => { cancel = true; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes.join(","), start, end]);

  const days = billedDays(start, end);
  // Live estimate only (straight-line x 1.3, no API call). The authoritative
  // fee is computed server-side from real driving distance on submit.
  const estimatedDistanceKm = addressCoords
    ? haversineKm(DEPOT.lat, DEPOT.lon, addressCoords.lat, addressCoords.lon) * 1.3
    : null;
  const deliveryFee = estimatedDistanceKm != null ? deliveryFeeForDistance(estimatedDistanceKm, pricing) : pricing.deliveryBaseFee;
  const base = selectedAssets.reduce((s, a) => s + a.daily_rate * days * quantityFor(a.type), 0);
  const price = computePrice({ asset: { daily_rate: base }, days: 1, deliveryFee, waiver, waiverFee: pricing.waiverFee });

  const statuses = selectedTypes.map((t) => availByType[t]?.status).filter((s): s is AvailabilityVerdict => !!s);
  const status = selectedTypes.length === 0
    ? null
    : statuses.length < selectedTypes.length
    ? null
    : statuses.includes("unavailable") ? "unavailable" : statuses.includes("limited") ? "limited" : "available";

  const payload = (): BookingInput => ({
    items: selectedAssets.map((a) => ({ assetType: a.type, assetId: a.id, quantity: quantityFor(a.type) })),
    start, end, deliveryTime, collectionTime, waiver, address,
    addressLat: addressCoords?.lat, addressLon: addressCoords?.lon,
    billingAddress: billingDifferent ? billingAddress : "",
    siteContact, eventType, customer: fullName,
    customerPhone: phone, customerWhatsapp: whatsapp, customerEmail: email,
    paymentMethod,
  });

  // Name, a way to contact them, and where to deliver are needed for any
  // quote or booking to actually be actionable - the server enforces the
  // same thing, this is just so the customer finds out before submitting
  // instead of after.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const missingRequiredFields = (): string[] => {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("full name");
    if (!phone.trim()) missing.push("contact number");
    if (!address.trim()) missing.push("delivery address");
    return missing;
  };
  const requiredFieldsOk = missingRequiredFields().length === 0;

  const checkRequiredFields = (): boolean => {
    setAttemptedSubmit(true);
    const missing = missingRequiredFields();
    if (missing.length > 0) {
      setError(`Please fill in your ${missing.join(", ")} to continue.`);
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!checkRequiredFields()) return;
    setSubmitting(true); setError(null);
    const res = await createQuoteAction(payload());
    setSubmitting(false);
    if (res.ok) setModal({ kind: "quote", code: res.code, expires: res.expires_at });
    else setError(res.error);
  };

  // Both booking and quote-conversion require Terms agreement, so both just
  // queue what to do and open the modal; the modal's onAgree runs it.
  const onConfirm = () => { if (checkRequiredFields()) setPendingAction({ kind: "book" }); };
  const onConvert = (code: string) => setPendingAction({ kind: "convert", code });

  const onAgreeAndContinue = async (consentResult: ConsentResult) => {
    if (!pendingAction) return;
    const consent: ConsentInput = { ...consentResult, termsTitle, termsBody };
    setSubmitting(true); setError(null);
    const res = pendingAction.kind === "book"
      ? await createBookingAction({ ...payload(), consent })
      : await convertQuoteAction(pendingAction.code, consent, paymentMethod);
    setSubmitting(false);
    setPendingAction(null);
    if (res.ok) {
      setModal({
        kind: "booking", bookings: res.bookings, paymentReference: res.paymentReference,
        paymentMethod: res.paymentMethod ?? paymentMethod, checkoutUrl: res.checkoutUrl ?? null,
      });
    } else setError(res.error);
  };

  // Prefer a photo of whatever's selected; otherwise show any real unit
  // photo that's been uploaded (Admin > Assets), so this never shows a
  // stock/fake image, only what's actually on file for the fleet.
  const heroAsset = selectedAssets.find((a) => a.image_url) ?? assets.find((a) => a.image_url);
  const heroImage = heroAsset?.image_url ? { url: heroAsset.image_url, alt: heroAsset.name } : null;

  return (
    <div id="top">
      {/* Hero */}
      <section className="border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-container-padding py-14 md:py-20 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 flex flex-col gap-5">
            <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface max-w-2xl">
              Mobile catering equipment, delivered anywhere in Gauteng.
            </h1>
            <p className="max-w-xl font-body-lg text-on-surface-variant">
              Fridges, toilets, food warmers, mobile kitchens, marquee tents and chairs. Pick what you need, choose your dates, and we deliver, set up and collect, fixed pricing, no surprises on the day.
            </p>
            <div className="flex flex-wrap gap-5 text-sm text-on-surface-variant font-medium">
              <Check label="Delivery & collection included" />
              <Check label="Fixed daily pricing" />
              <Check label="Across Gauteng" />
            </div>
          </div>
          <div className="lg:col-span-4 rounded-xl overflow-hidden border border-outline-variant h-64 lg:h-full">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage.url} alt={heroImage.alt} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                <Icon name={selectedTypes[0] ? ASSET_TYPE_META[selectedTypes[0]].icon : "festival"} className="text-6xl opacity-30" />
              </div>
            )}
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
              <StepHead n={1} label="Choose your units" />
              <p className="text-xs text-on-surface-variant -mt-2">Select as many as you need, you can hire more than one.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {types.map((t) => {
                  const a = firstAssetOfType(t);
                  if (!a) return null;
                  const m = ASSET_TYPE_META[t];
                  const on = selectedTypes.includes(t);
                  const quantityCapable = isQuantityCapable(t);
                  return (
                    // A real <button> can't contain the quantity <input> below (invalid
                    // HTML, flaky focus), so this tile is a div acting as a button.
                    <div
                      key={t}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleType(t)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleType(t); } }}
                      aria-pressed={on}
                      className={`text-left bg-surface-container-lowest rounded-xl p-5 border-2 transition-all relative cursor-pointer ${
                        on ? "active-tile" : "border-outline-variant hover:border-on-surface-variant"
                      }`}
                    >
                      <span className={`absolute top-4 right-4 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                        on ? "bg-primary border-primary" : "border-outline bg-surface"
                      }`}>
                        {on && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3 8.5L6.2 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {a.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image_url} alt={a.name} className="w-full h-48 object-cover rounded-lg mb-3" />
                      ) : (
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface">
                            <Icon name={m.icon} className="text-xl" />
                          </span>
                        </div>
                      )}
                      <h3 className="font-headline-md text-headline-md mb-1 pr-8">{a.name}</h3>
                      <p className="text-on-surface-variant font-body-md text-sm mb-4">{a.description}</p>
                      <span className="font-headline-lg text-xl text-on-surface">
                        {ZAR(a.daily_rate)}
                        <span className="text-sm font-body-md text-on-surface-variant"> / {quantityCapable ? "chair / day" : "day"}</span>
                      </span>
                      {quantityCapable && on && (
                        <div
                          className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">
                            How many?
                          </label>
                          <input
                            type="number" min={1} max={a.quantity_available}
                            value={quantityFor(t)}
                            onChange={(e) => setQuantity(t, Number(e.target.value))}
                            className="w-20 text-right px-2 py-1.5 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Step 2 */}
            <section className="space-y-4 pt-4">
              <StepHead n={2} label="Select dates & times" />
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <DatePicker
                  label="Delivery date" value={start} minDate={minDate}
                  onChange={(v) => { setStart(v); if (v > end) setEnd(v); }}
                  calendarByDate={calendarByDate} onVisibleMonthChange={ensureCalendarMonth}
                />
                <DatePicker
                  label="Collection date" value={end} minDate={start}
                  onChange={setEnd}
                  calendarByDate={calendarByDate} onVisibleMonthChange={ensureCalendarMonth}
                />
                <Field label="Delivery time">
                  <input
                    type="time" value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
                <Field label="Collection time">
                  <input
                    type="time" value={collectionTime}
                    onChange={(e) => setCollectionTime(e.target.value)}
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
                <Field label="Street address" required>
                  <AddressAutocomplete
                    value={address}
                    onChange={(text) => { setAddress(text); setAddressCoords(null); }}
                    onSelect={(s) => { setAddress(s.formatted); setAddressCoords({ lat: s.lat, lon: s.lon }); }}
                    placeholder="e.g. 152 Jan Smuts Ave, Rosebank"
                    invalid={attemptedSubmit && !address.trim()}
                  />
                  <p className="text-xs text-on-surface-variant">
                    {addressCoords
                      ? `Delivery fee is estimated from this pin: ${ZAR(deliveryFee)}.`
                      : "Pick a suggestion to price delivery by distance, or type the full address manually."}
                  </p>
                </Field>
                <Field label="Event type">
                  <select
                    value={eventType} onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  >
                    <option value="">Select event type</option>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Site contact person">
                  <input
                    type="text" value={siteContact} onChange={(e) => setSiteContact(e.target.value)}
                    placeholder="Who should we call when we arrive on site?"
                    className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                  />
                </Field>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="font-label-md text-label-md">Damage waiver</p>
                    <p className="text-xs text-on-surface-variant">Covers accidental damage on site. {ZAR(pricing.waiverFee)} flat.</p>
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

            {/* Step 4 */}
            <section className="space-y-4 pt-4">
              <StepHead n={4} label="Your details" />
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-gutter">
                <Field label="Full name" required>
                  <input
                    type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Thandi Mokoena"
                    className={`w-full bg-surface border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md ${
                      attemptedSubmit && !fullName.trim() ? "border-error" : "border-outline"
                    }`}
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                  <Field label="Contact number" required>
                    <input
                      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="082 123 4567"
                      className={`w-full bg-surface border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md ${
                        attemptedSubmit && !phone.trim() ? "border-error" : "border-outline"
                      }`}
                    />
                    <label className="flex items-center gap-2 mt-2 text-sm text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="rounded border-outline" />
                      This number has WhatsApp
                    </label>
                  </Field>
                  <Field label="Email address (optional)">
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                    />
                  </Field>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-label-md cursor-pointer">
                    <input
                      type="checkbox" checked={billingDifferent}
                      onChange={(e) => setBillingDifferent(e.target.checked)}
                      className="rounded border-outline"
                    />
                    Billing address is different from delivery address
                  </label>
                  {billingDifferent && (
                    <input
                      type="text" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Billing address"
                      className="w-full mt-3 bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
                    />
                  )}
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
                    <AvailBadge status={status} />
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-3 pt-2">
                    {selectedAssets.length === 0 && (
                      <p className="text-sm text-on-surface-variant">Choose at least one unit to see pricing.</p>
                    )}
                    {selectedAssets.map((a) => {
                      const qty = quantityFor(a.type);
                      const qtyLabel = qty > 1 ? ` x${qty}` : "";
                      return (
                        <Line
                          key={a.id}
                          label={`${a.name}${qtyLabel} (${days} day${days > 1 ? "s" : ""})`}
                          value={ZAR(a.daily_rate * days * qty)}
                        />
                      );
                    })}
                    {selectedAssets.length > 0 && (
                      <>
                        <Line label="Delivery cost" value={ZAR(price.delivery)} />
                        {waiver && <Line label="Damage waiver" value={ZAR(price.waiver)} />}
                        <div className="border-t border-outline-variant pt-3 flex justify-between items-center">
                          <span className="font-headline-md text-headline-md">Total</span>
                          <span className="font-display-lg text-2xl text-on-surface">{ZAR(price.total)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {paymentMethods.length > 1 && (
                    <div className="space-y-2 pt-2">
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

                  {error && (
                    <div className="bg-error-container text-on-error-container text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <Icon name="error" className="text-[18px]" /> {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="button" onClick={onConfirm}
                      disabled={submitting || selectedAssets.length === 0 || status === "unavailable"}
                      className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-base hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {status === "unavailable" ? "Unavailable for these dates" : submitting ? "Working..." : "Check availability & price"}
                    </button>
                    <button
                      type="button" onClick={onSave} disabled={submitting || selectedAssets.length === 0}
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

        {pendingAction && (
          <TermsConsentModal
            title={termsTitle}
            body={termsBody}
            onAgree={onAgreeAndContinue}
            onCancel={() => setPendingAction(null)}
            busy={submitting}
          />
        )}

        {modal && (
          <ResultModal
            modal={modal}
            onClose={() => setModal(null)}
            onConvert={onConvert}
            submitting={submitting}
            bank={bank}
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wider">
        {label}{required && <span className="text-error"> *</span>}
      </label>
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

function AvailBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <div className="bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
        <span className="w-2 h-2 rounded-full bg-outline" /> Checking
      </div>
    );
  }
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    available: { cls: "bg-tertiary-container text-tertiary", dot: "bg-tertiary", label: "Available" },
    limited: { cls: "bg-secondary-container text-secondary", dot: "bg-secondary", label: "Limited" },
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
  modal, onClose, onConvert, submitting, bank,
}: {
  modal: Exclude<Modal, null>;
  onClose: () => void;
  onConvert: (code: string) => void;
  submitting: boolean;
  bank: { bankName: string; bankAccountName: string; bankAccountNumber: string; bankBranchCode: string };
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
              {isQuote ? modal.code : modal.paymentReference}
            </p>
            {isQuote && <p className="text-[11px] text-on-surface-variant mt-1">Valid until {prettyDate(modal.expires)}</p>}
          </div>

          {!isQuote && modal.paymentMethod === "eft" && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-1 text-sm">
              <p className="font-label-md text-on-surface mb-1">Pay by bank transfer</p>
              {bank.bankName && <p><span className="text-on-surface-variant">Bank:</span> {bank.bankName}</p>}
              {bank.bankAccountName && <p><span className="text-on-surface-variant">Account holder:</span> {bank.bankAccountName}</p>}
              {bank.bankAccountNumber && <p><span className="text-on-surface-variant">Account number:</span> {bank.bankAccountNumber}</p>}
              {bank.bankBranchCode && <p><span className="text-on-surface-variant">Branch code:</span> {bank.bankBranchCode}</p>}
              <p className="text-on-surface-variant pt-1">Use <span className="font-code-sm text-on-surface">{modal.paymentReference}</span> as your payment reference.</p>
            </div>
          )}

          {!isQuote && modal.checkoutUrl && (
            <a
              href={modal.checkoutUrl} target="_blank" rel="noreferrer"
              className="block text-center bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-90 active:scale-[0.99] transition-all"
            >
              Pay now
            </a>
          )}

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
