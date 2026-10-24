"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Asset, AssetType, Booking, BookingStatus, Quote, SiteContent, GalleryImage, Payment } from "@/lib/types";
import type { PricingSettings } from "@/lib/pricing";
import type { CompanySettings } from "@/lib/company";
import { groupOrders, type Order } from "@/lib/order";
import { ZAR, ZARk } from "@/lib/format";
import { prettyDate } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { setOrderStatusAction, updateAssetAction, addAssetAction } from "@/app/actions";
import {
  updatePricingSettingsAction, updateSiteContentAction,
  uploadAssetImageAction, addGalleryImageAction, deleteGalleryImageAction, updateCompanySettingsAction,
  markPaymentPaidAction,
} from "@/app/admin/settings-actions";

type Tab = "overview" | "bookings" | "assets" | "settings";
const TYPE_ICON: Record<AssetType, string> = { fridge: "ac_unit", toilet: "wc" };

export function AdminTabs({
  assets, bookings, payments, quotes, todayIso, pricing, siteContent, galleryImages, company,
}: {
  assets: Asset[];
  bookings: Booking[];
  payments: Payment[];
  quotes: Quote[];
  todayIso: string;
  pricing: PricingSettings;
  siteContent: SiteContent[];
  galleryImages: GalleryImage[];
  company: CompanySettings;
}) {
  const orders = useMemo(() => groupOrders(bookings, payments), [bookings, payments]);
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "bookings", label: "Bookings" },
    { id: "assets", label: "Assets" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-stack-lg">
      <div className="flex gap-7 border-b border-outline-variant overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 font-label-md text-label-md whitespace-nowrap border-b-2 -mb-px ${
              tab === t.id ? "border-primary text-on-surface font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview assets={assets} orders={orders} quotes={quotes} todayIso={todayIso} />}
      {tab === "bookings" && <Bookings assets={assets} orders={orders} />}
      {tab === "assets" && <Assets assets={assets} />}
      {tab === "settings" && <Settings pricing={pricing} siteContent={siteContent} galleryImages={galleryImages} company={company} />}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({
  assets, orders, quotes, todayIso,
}: {
  assets: Asset[]; orders: Order[]; quotes: Quote[]; todayIso: string;
}) {
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const revenueHeld = confirmed.reduce((s, o) => s + o.total, 0);
  const upcoming = orders.filter((o) => o.status !== "cancelled" && o.end_date >= todayIso);
  const nextDeliveries = [...upcoming].sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 6);
  const convRate = quotes.length
    ? Math.round((quotes.filter((q) => q.status === "converted").length / quotes.length) * 100)
    : null;

  const unitsLabel = (o: Order) => o.bookings.map((b) => assets.find((a) => a.id === b.asset_id)?.name ?? (b.asset_type === "fridge" ? "Mobile Fridge" : "Double Toilet")).join(", ");

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        <Stat label="Confirmed Bookings" value={String(confirmed.length)} foot={`${orders.length} total`} />
        <Stat label="Revenue Held" value={ZARk(revenueHeld)} foot="Confirmed value" />
        <Stat label="Upcoming Deliveries" value={String(upcoming.length)} foot="From today" />
        <Stat label="Quote Conversion" value={convRate === null ? "-" : `${convRate}%`} foot={quotes.length ? `${quotes.length} quotes` : "No quotes yet"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Next deliveries */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-stack-md border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">Next Deliveries</h2>
            <span className="text-on-surface-variant font-label-md text-label-md">{nextDeliveries.length} scheduled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <Th>Units & Ref</Th><Th>Customer</Th><Th>Delivery</Th><Th className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {nextDeliveries.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant font-body-md">No upcoming deliveries.</td></tr>
                )}
                {nextDeliveries.map((o) => (
                  <tr key={o.orderId}>
                    <td className="px-6 py-4">
                      <div className="font-label-md text-on-surface flex items-center gap-2">
                        <Icon name={TYPE_ICON[o.bookings[0].asset_type]} className="text-[18px] text-on-surface-variant" />{unitsLabel(o)}
                      </div>
                      <div className="font-code-sm text-on-surface-variant text-xs">#{o.orderId.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 font-body-md">{o.customer}</td>
                    <td className="px-6 py-4 font-body-md">{prettyDate(o.start_date)}</td>
                    <td className="px-6 py-4 text-right"><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Utilisation */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-md flex flex-col gap-gutter">
          <h2 className="font-headline-md text-headline-md">Fleet Utilisation</h2>
          <div className="space-y-stack-md">
            {(["fridge", "toilet"] as AssetType[]).map((t) => {
              const cap = assets.filter((a) => a.type === t && a.active).reduce((s, a) => s + a.quantity_available, 0);
              const onHire = orders.filter(
                (o) => o.status === "confirmed" && o.start_date <= todayIso && o.end_date >= todayIso && o.bookings.some((b) => b.asset_type === t)
              ).length;
              const pct = cap ? Math.min(100, Math.round((onHire / cap) * 100)) : 0;
              const avail = Math.max(0, cap - onHire);
              const color = t === "fridge" ? "bg-primary" : "bg-tertiary";
              const txt = t === "fridge" ? "text-primary" : "text-tertiary";
              return (
                <div key={t}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-label-md text-label-md capitalize">{t === "fridge" ? "Mobile Fridge" : "Double Toilet"}</span>
                    <span className={`font-label-md text-label-md ${txt}`}>{pct}%</span>
                  </div>
                  <div className="h-4 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{avail} of {cap} available right now</p>
                </div>
              );
            })}
          </div>
          <div className="mt-auto pt-stack-lg">
            <PendingAlert orders={orders} todayIso={todayIso} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingAlert({ orders, todayIso }: { orders: Order[]; todayIso: string }) {
  const pending = orders.filter((o) => o.status === "pending" && o.end_date >= todayIso).length;
  if (pending === 0) {
    return (
      <div className="bg-tertiary/5 p-4 rounded-xl border border-tertiary/20">
        <h3 className="font-label-md text-label-md text-tertiary mb-1">All clear</h3>
        <p className="text-sm font-body-md">No pending bookings waiting on confirmation.</p>
      </div>
    );
  }
  return (
    <div className="bg-secondary-container/10 p-4 rounded-xl border border-secondary-container/30">
      <h3 className="font-label-md text-label-md text-secondary mb-1">Action needed</h3>
      <p className="text-sm font-body-md">{pending} pending booking{pending > 1 ? "s" : ""} awaiting confirmation. Review them in the Bookings tab.</p>
    </div>
  );
}

/* ---------------- Bookings ---------------- */
function Bookings({ assets, orders }: { assets: Asset[]; orders: Order[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");

  const unitsLabel = (o: Order) => o.bookings.map((b) => assets.find((a) => a.id === b.asset_id)?.name ?? (b.asset_type === "fridge" ? "Mobile Fridge" : "Double Toilet")).join(", ");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...orders]
      .filter((o) => (filter === "all" ? true : o.status === filter))
      .filter((o) => !needle || o.customer.toLowerCase().includes(needle) || o.orderId.toLowerCase().includes(needle))
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [orders, q, filter]);

  const setStatus = (orderId: string, status: BookingStatus) =>
    startTransition(async () => { await setOrderStatusAction(orderId, status); router.refresh(); });

  const [markError, setMarkError] = useState<string | null>(null);
  const markPaid = (reference: string) =>
    startTransition(async () => {
      const res = await markPaymentPaidAction(reference);
      if (!res.ok) setMarkError(res.error);
      else { setMarkError(null); router.refresh(); }
    });

  const filters: ("all" | BookingStatus)[] = ["all", "pending", "confirmed", "cancelled"];

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
      <div className="p-stack-md border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-stack-md">
        <h2 className="font-headline-md text-headline-md">Booking Register</h2>
        <div className="flex flex-col sm:flex-row gap-stack-sm w-full md:w-auto">
          <div className="relative flex-grow">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
              placeholder="Search customer or ref..." type="text"
            />
            <Icon name="search" className="absolute left-3 top-2.5 text-on-surface-variant" />
          </div>
          <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md font-label-md text-label-md capitalize transition-colors ${
                  filter === f ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      {markError && <p className="px-6 pt-3 text-sm text-error">{markError}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr><Th>Delivery</Th><Th>Customer</Th><Th>Units</Th><Th>Days</Th><Th>Total</Th><Th>Payment</Th><Th>Status</Th><Th className="text-right">Action</Th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-10 text-center text-on-surface-variant font-body-md">No bookings match.</td></tr>
            )}
            {rows.map((o) => (
              <tr key={o.orderId} className={pending ? "opacity-60" : ""}>
                <td className="px-6 py-4 font-body-md whitespace-nowrap">{prettyDate(o.start_date)} - {prettyDate(o.end_date)}</td>
                <td className="px-6 py-4 font-label-md">
                  {o.customer}
                  <div className="font-code-sm text-on-surface-variant text-xs">#{o.orderId.slice(0, 8).toUpperCase()}</div>
                </td>
                <td className="px-6 py-4 font-body-md text-on-surface-variant">{unitsLabel(o)}</td>
                <td className="px-6 py-4 font-body-md">{o.days}</td>
                <td className="px-6 py-4 font-label-md">{ZAR(o.total)}</td>
                <td className="px-6 py-4 font-body-md text-on-surface-variant">
                  <span className="capitalize">{o.paymentGateway ?? "-"}</span>
                  {o.paymentStatus && <span className="text-xs block capitalize">{o.paymentStatus}</span>}
                </td>
                <td className="px-6 py-4"><StatusPill status={o.status} /></td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {o.paymentGateway === "eft" && o.paymentStatus === "pending" && o.paymentReference && (
                    <button onClick={() => markPaid(o.paymentReference as string)} className="text-tertiary font-label-md text-label-md hover:underline mr-3">Mark as paid</button>
                  )}
                  {o.status === "pending" && (
                    <button onClick={() => setStatus(o.orderId, "confirmed")} className="text-tertiary font-label-md text-label-md hover:underline mr-3">Confirm</button>
                  )}
                  {o.status !== "cancelled" ? (
                    <button onClick={() => setStatus(o.orderId, "cancelled")} className="text-error font-label-md text-label-md hover:underline">Cancel</button>
                  ) : (
                    <button onClick={() => setStatus(o.orderId, "pending")} className="text-primary font-label-md text-label-md hover:underline">Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Assets ---------------- */
function Assets({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const toggleActive = (a: Asset) =>
    startTransition(async () => { await updateAssetAction(a.id, { active: !a.active }); refresh(); });

  const add = (type: AssetType) =>
    startTransition(async () => { await addAssetAction(type); refresh(); });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
      {assets.map((a) => (
        <AssetCard key={a.id} asset={a} pending={pending} onToggle={() => toggleActive(a)} onSaved={refresh} startTransition={startTransition} />
      ))}

      <div className="bg-surface-variant/30 p-stack-md rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-3">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
          <Icon name="add" className="text-4xl" />
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface-variant">Add Asset</h3>
        <p className="font-body-md text-on-surface-variant text-sm max-w-[220px]">Add another unit and set its daily rate.</p>
        <div className="flex gap-2">
          <button onClick={() => add("fridge")} disabled={pending} className="px-3 py-1.5 border-2 border-primary text-primary rounded-lg font-label-md text-label-md hover:bg-primary hover:text-white transition-all disabled:opacity-40">+ Fridge</button>
          <button onClick={() => add("toilet")} disabled={pending} className="px-3 py-1.5 border-2 border-primary text-primary rounded-lg font-label-md text-label-md hover:bg-primary hover:text-white transition-all disabled:opacity-40">+ Toilet</button>
        </div>
      </div>
    </div>
  );
}

function AssetCard({
  asset, pending, onToggle, onSaved, startTransition,
}: {
  asset: Asset;
  pending: boolean;
  onToggle: () => void;
  onSaved: () => void;
  startTransition: (cb: () => void) => void;
}) {
  const [rate, setRate] = useState(asset.daily_rate);
  const [qty, setQty] = useState(asset.quantity_available);
  const [name, setName] = useState(asset.name);
  const dirty = rate !== asset.daily_rate || qty !== asset.quantity_available || name !== asset.name;

  const save = () =>
    startTransition(async () => {
      await updateAssetAction(asset.id, { daily_rate: rate, quantity_available: qty, name });
      onSaved();
    });

  const chip = asset.type === "fridge" ? "bg-primary-container/20 text-primary" : "bg-secondary-container/20 text-secondary";
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("image", file);
    startTransition(async () => {
      const res = await uploadAssetImageAction(asset.id, fd);
      setUploading(false);
      if (res.ok) onSaved();
      else setUploadError(res.error);
    });
  };

  return (
    <div className="bg-surface-container-lowest p-stack-md rounded-xl custom-shadow flex flex-col border border-outline-variant/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="w-full h-32 rounded-lg bg-surface-container-low mb-stack-md overflow-hidden flex items-center justify-center">
        {asset.image_url ? (
          <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <Icon name={TYPE_ICON[asset.type]} className="text-4xl text-on-surface-variant" />
        )}
      </div>
      <label className="text-xs font-label-md text-primary hover:underline cursor-pointer mb-stack-md self-start">
        {uploading ? "Uploading..." : asset.image_url ? "Change photo" : "Add photo"}
        <input
          type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
      </label>
      {uploadError && <p className="text-xs text-error mb-stack-md">{uploadError}</p>}

      <div className="flex justify-between items-start mb-stack-md">
        <div className={`w-12 h-12 ${chip} rounded-lg flex items-center justify-center`}>
          <Icon name={TYPE_ICON[asset.type]} className="text-3xl" />
        </div>
        <div className="flex flex-col items-end">
          <span className="font-code-sm text-xs text-on-surface-variant">{asset.category_code}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-label-md ${asset.active ? "text-tertiary" : "text-on-surface-variant"}`}>{asset.active ? "Active" : "Inactive"}</span>
            <button
              onClick={onToggle} disabled={pending} aria-pressed={asset.active}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${asset.active ? "bg-tertiary" : "bg-outline-variant"}`}
            >
              <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${asset.active ? "translate-x-4" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <input
        value={name} onChange={(e) => setName(e.target.value)}
        className="font-headline-md text-headline-md mb-1 bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none rounded-none"
      />
      <p className="font-body-md text-on-surface-variant text-sm mb-4">{asset.description}</p>

      <div className="mt-auto space-y-3">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
          <span className="font-label-md text-on-surface-variant">Inventory Count</span>
          <input type="number" min={0} value={qty} onChange={(e) => setQty(Math.max(0, Number(e.target.value)))} className="w-16 text-right p-1 font-label-md bg-surface-bright border border-outline-variant/40 focus:ring-1 focus:ring-primary rounded" />
        </div>
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
          <span className="font-label-md text-on-surface-variant">Daily Rate</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-label-md">R</span>
            <input type="number" min={0} value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value)))} className="w-24 text-right p-1 font-label-md bg-surface-bright border border-outline-variant/40 focus:ring-1 focus:ring-primary rounded" />
          </div>
        </div>
      </div>

      <button
        onClick={save} disabled={!dirty || pending}
        className="mt-stack-md w-full py-2 border-2 border-primary text-primary font-label-md rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-primary"
      >
        {dirty ? "Save Changes" : "Saved"}
      </button>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function Settings({
  pricing, siteContent, galleryImages, company,
}: {
  pricing: PricingSettings;
  siteContent: SiteContent[];
  galleryImages: GalleryImage[];
  company: CompanySettings;
}) {
  return (
    <div className="space-y-stack-lg max-w-3xl">
      <BusinessDetailsForm company={company} />
      <PricingForm pricing={pricing} />
      <ContentEditor slug="about" title="About" initial={siteContent.find((c) => c.slug === "about")} />
      <ContentEditor slug="terms" title="Terms & policies" initial={siteContent.find((c) => c.slug === "terms")} />
      <GalleryManager images={galleryImages} />
    </div>
  );
}

function BusinessDetailsForm({ company }: { company: CompanySettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<CompanySettings>(company);
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(form) as (keyof CompanySettings)[]).some((k) => form[k] !== company[k]);

  const set = (k: keyof CompanySettings) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const save = () =>
    startTransition(async () => {
      await updateCompanySettingsAction(form);
      setSaved(true);
      router.refresh();
    });

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-md space-y-stack-md">
      <div>
        <h2 className="font-headline-md text-headline-md">Business details</h2>
        <p className="text-sm text-on-surface-variant">
          Used on emails, the website footer, invoices and the Terms &amp; Policies page.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
        <TextField label="Trading name" value={form.tradingName} onChange={set("tradingName")} />
        <TextField label="Registered legal name" value={form.legalName} onChange={set("legalName")} />
        <TextField label="Company registration number" value={form.registrationNumber} onChange={set("registrationNumber")} />
        <TextField label="VAT number" value={form.vatNumber} onChange={set("vatNumber")} />
        <TextField label="Company email" value={form.email} onChange={set("email")} type="email" />
        <TextField label="Company phone" value={form.phone} onChange={set("phone")} />
        <TextField
          label="Admin notification email"
          value={form.adminNotifyEmail}
          onChange={set("adminNotifyEmail")}
          type="email"
          hint="Where quote/booking/payment alerts go. Falls back to company email if left blank."
        />
      </div>
      <TextField label="Registered address" value={form.address} onChange={set("address")} />

      <div className="pt-2 border-t border-outline-variant">
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mt-stack-md mb-3">
          Bank details (for manual EFT payments)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
          <TextField label="Bank name" value={form.bankName} onChange={set("bankName")} />
          <TextField label="Account holder" value={form.bankAccountName} onChange={set("bankAccountName")} />
          <TextField label="Account number" value={form.bankAccountNumber} onChange={set("bankAccountNumber")} />
          <TextField label="Branch code" value={form.bankBranchCode} onChange={set("bankBranchCode")} />
        </div>
      </div>

      <button
        onClick={save} disabled={!dirty || pending}
        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
      >
        {saved && !dirty ? "Saved" : pending ? "Saving..." : "Save business details"}
      </button>
    </section>
  );
}

function TextField({
  label, value, onChange, type = "text", hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-label-md text-on-surface-variant uppercase tracking-wider">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
      />
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

function PricingForm({ pricing }: { pricing: PricingSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [baseFee, setBaseFee] = useState(pricing.deliveryBaseFee);
  const [ratePerKm, setRatePerKm] = useState(pricing.deliveryRatePerKm);
  const [waiverFee, setWaiverFee] = useState(pricing.waiverFee);
  const [saved, setSaved] = useState(false);
  const dirty = baseFee !== pricing.deliveryBaseFee || ratePerKm !== pricing.deliveryRatePerKm || waiverFee !== pricing.waiverFee;

  const save = () =>
    startTransition(async () => {
      await updatePricingSettingsAction({ deliveryBaseFee: baseFee, deliveryRatePerKm: ratePerKm, waiverFee });
      setSaved(true);
      router.refresh();
    });

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-md space-y-stack-md">
      <div>
        <h2 className="font-headline-md text-headline-md">Delivery pricing</h2>
        <p className="text-sm text-on-surface-variant">Applies to every new booking and quote.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        <NumberField label="Base delivery fee (R)" value={baseFee} onChange={(v) => { setBaseFee(v); setSaved(false); }} />
        <NumberField label="Cost per kilometre (R)" value={ratePerKm} onChange={(v) => { setRatePerKm(v); setSaved(false); }} />
        <NumberField label="Damage waiver (R)" value={waiverFee} onChange={(v) => { setWaiverFee(v); setSaved(false); }} />
      </div>
      <button
        onClick={save} disabled={!dirty || pending}
        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
      >
        {saved && !dirty ? "Saved" : pending ? "Saving..." : "Save pricing"}
      </button>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-label-md text-on-surface-variant uppercase tracking-wider">{label}</label>
      <input
        type="number" min={0} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full px-3 py-2 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
      />
    </div>
  );
}

function ContentEditor({ slug, title, initial }: { slug: string; title: string; initial?: SiteContent }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [heading, setHeading] = useState(initial?.title ?? title);
  const [body, setBody] = useState(initial?.body ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = heading !== (initial?.title ?? title) || body !== (initial?.body ?? "");

  const save = () =>
    startTransition(async () => {
      await updateSiteContentAction(slug, heading, body);
      setSaved(true);
      router.refresh();
    });

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-md space-y-stack-md">
      <div>
        <h2 className="font-headline-md text-headline-md">{title}</h2>
        <p className="text-sm text-on-surface-variant">Shown on the public Gallery page.</p>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Heading</label>
        <input
          value={heading} onChange={(e) => { setHeading(e.target.value); setSaved(false); }}
          className="w-full px-3 py-2 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Body</label>
        <textarea
          value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }}
          rows={6}
          className="w-full px-3 py-2 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
        />
        <p className="text-xs text-on-surface-variant">Leave a blank line between paragraphs.</p>
      </div>
      <button
        onClick={save} disabled={!dirty || pending}
        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
      >
        {saved && !dirty ? "Saved" : pending ? "Saving..." : "Save"}
      </button>
    </section>
  );
}

function GalleryManager({ images }: { images: GalleryImage[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("image", file);
    fd.set("caption", caption);
    startTransition(async () => {
      const res = await addGalleryImageAction(fd);
      if (res.ok) { setCaption(""); setFileKey((k) => k + 1); router.refresh(); }
      else setError(res.error);
    });
  };

  const remove = (id: string) =>
    startTransition(async () => { await deleteGalleryImageAction(id); router.refresh(); });

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-md space-y-stack-md">
      <div>
        <h2 className="font-headline-md text-headline-md">Gallery</h2>
        <p className="text-sm text-on-surface-variant">Photos shown on the public Gallery page.</p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative rounded-lg overflow-hidden border border-outline-variant">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption || "Gallery photo"} className="w-full h-28 object-cover" />
              <button
                onClick={() => remove(img.id)} disabled={pending}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-on-surface/70 text-white text-xs flex items-center justify-center hover:bg-on-surface disabled:opacity-40"
                aria-label="Remove photo"
              >
                <Icon name="close" className="text-sm" />
              </button>
              {img.caption && <p className="absolute bottom-0 inset-x-0 bg-on-surface/70 text-white text-xs px-2 py-1 truncate">{img.caption}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-stack-sm items-start sm:items-end">
        <div className="space-y-1.5 flex-grow">
          <label className="block text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Caption (optional)</label>
          <input
            value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Setup at a Sandton wedding"
            className="w-full px-3 py-2 rounded-lg border border-outline bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
          />
        </div>
        <label className="px-4 py-2 border border-primary text-primary rounded-lg font-label-md text-sm font-bold hover:bg-primary hover:text-on-primary transition-all cursor-pointer whitespace-nowrap">
          {pending ? "Uploading..." : "Add photo"}
          <input
            key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={pending}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </section>
  );
}

/* ---------------- small bits ---------------- */
function Stat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant flex flex-col gap-2">
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between">
        <span className="font-headline-lg text-headline-lg text-on-surface">{value}</span>
        <span className="text-on-surface-variant font-label-md text-label-md">{foot}</span>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-6 py-3 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-outline-variant ${className}`}>
      {children}
    </th>
  );
}
