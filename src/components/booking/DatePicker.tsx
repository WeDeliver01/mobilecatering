"use client";

import { useEffect, useRef, useState } from "react";
import { iso, parse, prettyDate } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";

export interface CalendarDayInfo {
  fullyBooked: boolean;
  limited: boolean;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function DatePicker({
  label, value, onChange, minDate, calendarByDate, onVisibleMonthChange,
}: {
  label: string;
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  minDate: string;
  calendarByDate: Record<string, CalendarDayInfo>;
  onVisibleMonthChange: (monthStart: string, monthEnd: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchor = parse(value || minDate);
  const [viewMonth, setViewMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const monthStart = iso(viewMonth);
    const monthEnd = iso(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));
    onVisibleMonthChange(monthStart, monthEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth.getFullYear(), viewMonth.getMonth()]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  const minMonthStart = (() => { const m = parse(minDate); return new Date(m.getFullYear(), m.getMonth(), 1); })();
  const canGoPrev = firstOfMonth.getTime() > minMonthStart.getTime();

  return (
    <div className="relative" ref={boxRef}>
      <label className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wider mb-2">{label}</label>
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md text-left flex items-center justify-between"
      >
        <span className={value ? "" : "text-on-surface-variant"}>{value ? prettyDate(value) : "Select date"}</span>
        <Icon name="calendar_month" className="text-lg text-on-surface-variant" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button" disabled={!canGoPrev}
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="p-1 rounded hover:bg-surface-container-low disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" />
            </button>
            <span className="font-label-md text-label-md">
              {viewMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="p-1 rounded hover:bg-surface-container-low"
              aria-label="Next month"
            >
              <Icon name="chevron_right" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] text-on-surface-variant text-center mb-1">
            {WEEKDAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`empty-${i}`} />;
              const dateStr = iso(d);
              const info = calendarByDate[dateStr];
              const disabled = dateStr < minDate || !!info?.fullyBooked;
              const selected = dateStr === value;
              return (
                <button
                  key={dateStr} type="button" disabled={disabled}
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  title={disabled && info?.fullyBooked ? "Fully booked" : undefined}
                  className={`h-8 w-8 rounded-md text-sm flex items-center justify-center transition-all ${
                    selected
                      ? "bg-primary text-on-primary font-bold"
                      : disabled
                      ? "text-on-surface-variant/40 line-through cursor-not-allowed"
                      : info?.limited
                      ? "text-secondary font-bold hover:bg-surface-container-low"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary" /> Limited
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-on-surface-variant/40" /> Fully booked
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
