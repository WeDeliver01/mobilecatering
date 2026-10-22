"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSuggestion } from "@/app/api/geocode/autocomplete/route";

// Debounced well past normal typing speed, plus a session-local cache, so
// retyping or backspacing to a prefix already looked up costs zero extra
// requests. Geoapify's free tier is billed per call, not per booking.
const DEBOUNCE_MS = 450;

export function AddressAutocomplete({
  value, onChange, onSelect, placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, AddressSuggestion[]>>(new Map());
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) { skipNextRef.current = false; return; }

    const key = value.trim().toLowerCase();
    if (key.length < 3) { setSuggestions([]); return; }

    const cached = cacheRef.current.get(key);
    if (cached) { setSuggestions(cached); setOpen(cached.length > 0); return; }

    let cancel = false;
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geocode/autocomplete?text=${encodeURIComponent(value)}`, { cache: "no-store" });
        const data = (await r.json()) as { suggestions: AddressSuggestion[] };
        if (cancel) return;
        cacheRef.current.set(key, data.suggestions);
        setSuggestions(data.suggestions);
        setOpen(data.suggestions.length > 0);
      } catch {
        if (!cancel) setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => { cancel = true; clearTimeout(id); };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (s: AddressSuggestion) => {
    skipNextRef.current = true; // the formatted text about to land in `value` is already known, no need to re-query it
    onSelect(s);
    setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-surface border-outline border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.lat},${s.lon}`}>
              <button
                type="button"
                onClick={() => select(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors"
              >
                {s.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
