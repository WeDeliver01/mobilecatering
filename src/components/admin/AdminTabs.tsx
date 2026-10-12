"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Asset, AssetType, Booking, BookingStatus, Quote } from "@/lib/types";
import { ZAR, ZARk } from "@/lib/format";
import { prettyDate } from "@/lib/dates";
import { BrandBar } from "@/components/ui/BrandBar";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { setBookingStatusAction, updateAssetAction, addAssetAction } from "@/app/actions";

type Tab = "overview" | "bookings" | "assets";
const TYPE_ICON: Record<AssetType, string> = { fridge: "ac_unit", toilet: "wc" };

export function AdminTabs({
  assets, bookings, quotes, todayIso,
}: {
  assets: Asset[];
  bookings: Booking[];
  quotes: Quote[];
  todayIso: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "bookings", label: "Bookings" },
    { id: "assets", label: "Assets" },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-container-padding py-stack-lg">
      <div className="flex border-b border-outline-variant mb-stack-lg overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-gutter py-stack-sm font-label-md text-label-md whitespace-nowrap ${
              tab === t.id ? "active-tab" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview assets={assets} bookings={bookings} quotes={quotes} todayIso={todayIso} />}
      {tab === "bookings" && <Bookings assets={assets} bookings={bookings} />}
      {tab === "assets" && <Assets assets={assets} />}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({
  assets, bookings, quotes, todayIso,
}: {
  assets: Asset[]; bookings: Booking[]; quotes: Quote[]; todayIso: string;
}) {
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const revenueHeld = confirmed.reduce((s, b) => s + b.price_total, 0);
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.end_date >= todayIso);
  const nextDeliveries = [...upcoming].sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 6);
  const convRate = quotes.length
    ? Math.round((quotes.filter((q) => q.status === "converted").length / quotes.length) * 100)
    : null;

  const assetName = (b: Booking) => assets.find((a) => a.id === b.asset_id)?.name ?? (b.asset_type === "fridge" ? "Mobile Fridge" : "Double Toilet");

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        <Stat label="Confirmed Bookings" value={String(confirmed.length)} accent="border-primary" foot={`${bookings.length} total`} />
        <Stat label="Revenue Held" value={ZARk(revenueHeld)} accent="border-secondary-container" foot="Confirmed value" />
        <Stat label="Upcoming Deliveries" value={String(upcoming.length)} accent="border-tertiary-container" foot="From today" />
        <Stat label="Quote Conversion" value={convRate === null ? "-" : `${convRate}%`} accent="border-[#4e8051]" foot={quotes.length ? `${quotes.length} quotes` : "No quotes yet"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Next deliveries */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl custom-shadow overflow-hidden">
          <BrandBar />
          <div className="p-stack-md border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md">Next Deliveries</h2>
            <span className="text-on-surface-variant font-label-md text-label-md">{nextDeliveries.length} scheduled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <Th>Unit & Ref</Th><Th>Customer</Th><Th>Delivery</Th><Th className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {nextDeliveries.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant font-body-md">No upcoming deliveries.</td></tr>
                )}
                {nextDeliveries.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-label-md text-on-surface flex items-center gap-2">
                        <Icon name={TYPE_ICON[b.asset_type]} className="text-[18px] text-primary" />{assetName(b)}
                      </div>
                      <div className="font-code-sm text-on-surface-variant text-xs">#{b.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 font-body-md">{b.customer}</td>
                    <td className="px-6 py-4 font-body-md">{prettyDate(b.start_date)}</td>
                    <td className="px-6 py-4 text-right"><StatusPill status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Utilisation */}
        <div className="bg-surface-container-lowest rounded-xl custom-shadow p-stack-md flex flex-col gap-gutter">
          <h2 className="font-headline-md text-headline-md">Fleet Utilisation</h2>
          <div className="space-y-stack-md">
            {(["fridge", "toilet"] as AssetType[]).map((t) => {
              const cap = assets.filter((a) => a.type === t && a.active).reduce((s, a) => s + a.quantity_available, 0);
              const onHire = bookings.filter(
                (b) => b.asset_type === t && b.status === "confirmed" && b.start_date <= todayIso && b.end_date >= todayIso
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
            <PendingAlert bookings={bookings} todayIso={todayIso} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingAlert({ bookings, todayIso }: { bookings: Booking[]; todayIso: string }) {
  const pending = bookings.filter((b) => b.status === "pending" && b.end_date >= todayIso).length;
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
function Bookings({ assets, bookings }: { assets: Asset[]; bookings: Booking[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");

  const assetName = (b: Booking) => assets.find((a) => a.id === b.asset_id)?.name ?? (b.asset_type === "fridge" ? "Mobile Fridge" : "Double Toilet");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...bookings]
      .filter((b) => (filter === "all" ? true : b.status === filter))
      .filter((b) => !needle || b.customer.toLowerCase().includes(needle) || b.id.toLowerCase().includes(needle))
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [bookings, q, filter]);

  const setStatus = (id: string, status: BookingStatus) =>
    startTransition(async () => { await setBookingStatusAction(id, status); router.refresh(); });

  const filters: ("all" | BookingStatus)[] = ["all", "pending", "confirmed", "cancelled"];

  return (
    <div className="bg-surface-container-lowest rounded-xl custom-shadow overflow-hidden">
      <div className="p-stack-md border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-stack-md">
        <h2 className="font-headline-md text-headline-md">Booking Register</h2>
        <div className="flex flex-col sm:flex-row gap-stack-sm w-full md:w-auto">
          <div className="relative flex-grow">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant/40 bg-surface focus:ring-primary focus:border-primary font-body-md"
              placeholder="Search customer or ref..." type="text"
            />
            <Icon name="search" className="absolute left-3 top-2.5 text-on-surface-variant" />
          </div>
          <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md font-label-md text-label-md capitalize transition-colors ${
                  filter === f ? "bg-primary text-white" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr><Th>Delivery</Th><Th>Customer</Th><Th>Unit</Th><Th>Days</Th><Th>Total</Th><Th>Status</Th><Th className="text-right">Action</Th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant font-body-md">No bookings match.</td></tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} className={pending ? "opacity-60" : ""}>
                <td className="px-6 py-4 font-body-md whitespace-nowrap">{prettyDate(b.start_date)} - {prettyDate(b.end_date)}</td>
                <td className="px-6 py-4 font-label-md">
                  {b.customer}
                  <div className="font-code-sm text-on-surface-variant text-xs">#{b.id.slice(0, 8).toUpperCase()}</div>
                </td>
                <td className="px-6 py-4 font-body-md text-on-surface-variant">{assetName(b)}</td>
                <td className="px-6 py-4 font-body-md">{b.days}</td>
                <td className="px-6 py-4 font-label-md">{ZAR(b.price_total)}</td>
                <td className="px-6 py-4"><StatusPill status={b.status} /></td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {b.status === "pending" && (
                    <button onClick={() => setStatus(b.id, "confirmed")} className="text-tertiary font-label-md text-label-md hover:underline mr-3">Confirm</button>
                  )}
                  {b.status !== "cancelled" ? (
                    <button onClick={() => setStatus(b.id, "cancelled")} className="text-error font-label-md text-label-md hover:underline">Cancel</button>
                  ) : (
                    <button onClick={() => setStatus(b.id, "pending")} className="text-primary font-label-md text-label-md hover:underline">Restore</button>
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

  return (
    <div className="bg-surface-container-lowest p-stack-md rounded-xl custom-shadow flex flex-col border border-outline-variant/30">
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

/* ---------------- small bits ---------------- */
function Stat({ label, value, accent, foot }: { label: string; value: string; accent: string; foot: string }) {
  return (
    <div className={`bg-surface-container-lowest p-stack-md rounded-xl custom-shadow border-t-4 ${accent}`}>
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <span className="font-headline-lg text-headline-lg text-on-surface">{value}</span>
        <span className="text-on-surface-variant font-label-md text-label-md">{foot}</span>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-6 py-4 font-label-md text-label-md uppercase tracking-wider ${className}`}>{children}</th>;
}
