import { routeCache, roundCoord } from "./geoCache";
import { tryReserveGeoapifyCall } from "./geoBudget";

// Fixed depot origin for delivery-distance pricing.
// Approximate (suburb-level) coordinates for 1054 Block H, Soshanguve, good
// enough to ship with. Refine to the exact street pin once GEOAPIFY_API_KEY
// is set: geocode the depot address once (e.g. via the autocomplete route
// below, or https://apidocs.geoapify.com/playground/geocoding) and replace
// the values here.
export const DEPOT = { lat: -25.47288, lon: 28.09919 };

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Straight-line distance in km. No API key needed, used for the live
// client-side estimate and as the server-side fallback when Geoapify isn't
// configured or a lookup fails.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface RouteDistance {
  distanceKm: number;
  durationMinutes: number;
  source: "geoapify" | "straight-line";
}

// Real driving distance from the depot, via Geoapify Routing (server-side
// only, needs GEOAPIFY_API_KEY). Falls back to a straight-line estimate,
// padded ~30% to roughly approximate road distance, when no key is set or
// the request fails, so pricing still works before Geoapify is configured.
//
// Cached by rounded coordinates (see src/lib/geoCache.ts): repeat quotes
// for the same venue, or a saved quote later converted to a booking, reuse
// one Geoapify Routing call instead of paying for it again.
export async function depotDistanceTo(lat: number, lon: number): Promise<RouteDistance> {
  const cacheKey = `${roundCoord(lat)},${roundCoord(lon)}`;
  const cached = routeCache.get(cacheKey) as RouteDistance | undefined;
  if (cached) return cached;

  const result = await fetchDistance(lat, lon);
  routeCache.set(cacheKey, result);
  return result;
}

async function fetchDistance(lat: number, lon: number): Promise<RouteDistance> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (key && tryReserveGeoapifyCall()) {
    try {
      const url = `https://api.geoapify.com/v1/routing?waypoints=${DEPOT.lat},${DEPOT.lon}|${lat},${lon}&mode=drive&apiKey=${key}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const data = await r.json();
        const props = data?.features?.[0]?.properties;
        if (typeof props?.distance === "number" && typeof props?.time === "number") {
          return {
            distanceKm: props.distance / 1000,
            durationMinutes: Math.round(props.time / 60),
            source: "geoapify",
          };
        }
      }
    } catch {
      // fall through to the straight-line estimate below
    }
  }
  const straight = haversineKm(DEPOT.lat, DEPOT.lon, lat, lon);
  const roadEstimate = straight * 1.3;
  return {
    distanceKm: roadEstimate,
    durationMinutes: Math.round((roadEstimate / 40) * 60),
    source: "straight-line",
  };
}
