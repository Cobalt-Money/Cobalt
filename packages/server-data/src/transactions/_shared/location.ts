import type { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import type { LocationJson } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";

/** Null-set for clearing the flat lat/lon/address columns. */
export const LOCATION_FLAT_COLS = {
  address: null,
  city: null,
  country: null,
  lat: null,
  lon: null,
  postalCode: null,
  region: null,
  storeNumber: null,
} as const;

/** `LocationJson` → flat column updates (writes the 8 transaction location cols). */
export function locationToFlat(loc: LocationJson): Partial<typeof transaction.$inferInsert> {
  return {
    address: loc.address,
    city: loc.city,
    country: loc.country,
    lat: loc.lat,
    lon: loc.lon,
    postalCode: loc.postal_code,
    region: loc.region,
    storeNumber: loc.store_number,
  };
}

/** Flat row columns → `LocationJson`. */
export function flatToLocation(row: {
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  postalCode: string | null;
  region: string | null;
  storeNumber: string | null;
}): LocationJson {
  return {
    address: row.address,
    city: row.city,
    country: row.country,
    lat: row.lat,
    lon: row.lon,
    postal_code: row.postalCode,
    region: row.region,
    store_number: row.storeNumber,
  };
}
