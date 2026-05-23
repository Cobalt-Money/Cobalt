import type { LocationJson } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";

import { ApiError } from "../_shared/api-error.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim usage policy requires an identifying User-Agent with contact info.
const USER_AGENT = "Cobalt-Web (contact: sriketk5@gmail.com)";

interface NominatimAddress {
  city?: string;
  country?: string;
  country_code?: string;
  house_number?: string;
  postcode?: string;
  road?: string;
  state?: string;
  town?: string;
  village?: string;
}

interface NominatimResult {
  address?: NominatimAddress;
  display_name: string;
  lat: string;
  lon: string;
}

export interface GeocodeResult {
  displayName: string;
  location: LocationJson;
}

function toLocation(r: NominatimResult): LocationJson {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ") || null;
  const city = a.city ?? a.town ?? a.village ?? null;
  const lat = Number.parseFloat(r.lat);
  const lon = Number.parseFloat(r.lon);
  return {
    address: street,
    city,
    country: a.country ?? null,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    postal_code: a.postcode ?? null,
    region: a.state ?? null,
    store_number: null,
  };
}

export async function geocodeSearch(query: string, limit = 5): Promise<GeocodeResult[]> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new ApiError(502, "geocode_upstream_failed", `Nominatim returned ${res.status}`);
  }
  const data = (await res.json()) as NominatimResult[];
  return data.map((r) => ({
    displayName: r.display_name,
    location: toLocation(r),
  }));
}
