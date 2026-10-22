import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEPOT } from "@/lib/geo";
import { autocompleteCache } from "@/lib/geoCache";

export interface AddressSuggestion {
  formatted: string;
  lat: number;
  lon: number;
}

// Proxies to Geoapify so the API key never reaches the browser. Returns an
// empty list (never an error) when no key is configured or the text is too
// short, so the address field can fall back to plain manual entry.
//
// Cached (see src/lib/geoCache.ts): autocomplete is billed per request on
// Geoapify's free tier, and naive per-keystroke calls burn through it fast.
// Caching by the normalized query text means retyping, backspacing to a
// previous prefix, or two different customers searching the same suburb
// costs one Geoapify call, not one per keystroke per person.
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text")?.trim() ?? "";
  const key = process.env.GEOAPIFY_API_KEY;

  if (!key || text.length < 3) {
    return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
  }

  const cacheKey = text.toLowerCase();
  const cached = autocompleteCache.get(cacheKey) as AddressSuggestion[] | undefined;
  if (cached) return NextResponse.json({ suggestions: cached });

  const url =
    `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}` +
    `&filter=countrycode:za&bias=proximity:${DEPOT.lon},${DEPOT.lat}&limit=5&apiKey=${key}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
    const data = await r.json();
    const suggestions: AddressSuggestion[] = (data?.features ?? [])
      .map((f: { properties?: { formatted?: string }; geometry?: { coordinates?: [number, number] } }) => {
        const formatted = f.properties?.formatted;
        const coords = f.geometry?.coordinates;
        if (!formatted || !coords) return null;
        return { formatted, lon: coords[0], lat: coords[1] };
      })
      .filter((s: AddressSuggestion | null): s is AddressSuggestion => s !== null);
    autocompleteCache.set(cacheKey, suggestions);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
  }
}
