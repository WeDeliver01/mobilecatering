export const iso = (d: Date): string => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
};

export const parse = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const today = (): Date => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

// Nights billed = collection minus delivery (min 1). Matches the approved design,
// where 20 Nov -> 23 Nov is charged as 3 days.
export const billedDays = (start: string, end: string): number =>
  Math.max(1, Math.round((parse(end).getTime() - parse(start).getTime()) / 86400000));

// Physical occupancy is inclusive of both delivery and collection days: the unit
// cannot be re-let on any day in that window.
export const occupiedDays = (start: string, end: string): string[] => {
  const out: string[] = [];
  let cur = parse(start);
  const stop = parse(end);
  while (cur <= stop) {
    out.push(iso(cur));
    cur = addDays(cur, 1);
  }
  return out;
};

export const prettyDate = (s: string): string =>
  parse(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
