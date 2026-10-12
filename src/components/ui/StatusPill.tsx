const MAP: Record<string, string> = {
  confirmed: "bg-tertiary/10 text-tertiary",
  reserved: "bg-tertiary/10 text-tertiary",
  available: "bg-tertiary/10 text-tertiary",
  dispatched: "bg-tertiary/10 text-tertiary",
  converted: "bg-tertiary/10 text-tertiary",
  pending: "bg-secondary-container/20 text-secondary",
  preparing: "bg-secondary-container/20 text-secondary",
  active: "bg-primary/10 text-primary",
  completed: "bg-surface-variant text-on-surface-variant",
  paid: "bg-tertiary/10 text-tertiary",
  failed: "bg-error/10 text-error",
  refunded: "bg-surface-variant text-on-surface-variant",
  scheduled: "bg-secondary-container/20 text-secondary",
  out_for_delivery: "bg-primary/10 text-primary",
  delivered: "bg-tertiary/10 text-tertiary",
  collected: "bg-surface-variant text-on-surface-variant",
  cancelled: "bg-surface-variant text-on-surface-variant",
  expired: "bg-surface-variant text-on-surface-variant",
};

export function StatusPill({ status }: { status: string }) {
  const cls = MAP[status] ?? "bg-surface-variant text-on-surface-variant";
  return (
    <span className={`${cls} px-3 py-1 rounded-full font-label-md text-xs capitalize whitespace-nowrap`}>
      {status}
    </span>
  );
}
