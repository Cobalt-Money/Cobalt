import { char, doublePrecision, index, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

/**
 * SRI-354 — US locality → ZIP lookup.
 *
 * Seeded from the GeoNames US postal-code dump (~41k rows, many-to-many on
 * city↔ZIP). Drives the enrichment pre-filter: when a Plaid txn arrives with
 * `city + region` but no `postal_code`, we resolve the locality to its set of
 * ZIPs and feed the matcher's `byPostal` branch instead of falling through to
 * the much weaker `byCityRegion` (statewide trgm scan).
 *
 * Server-only. Static reference data — refreshed by re-running the loader
 * script, never written from app code.
 */
export const localityZip = pgTable(
  "locality_zip",
  {
    /** USPS-style city name (mixed case, as provided by GeoNames). */
    city: text("city").notNull(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    /** Two-letter state code (uppercase). */
    state: char("state", { length: 2 }).notNull(),
    /** 5-digit US ZIP. */
    zip5: text("zip5").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.city, t.state, t.zip5] }),
    // Lookup pattern from enrichment: WHERE lower(city)=$1 AND state=$2.
    index("locality_zip_lookup_idx").on(t.state, t.city),
  ],
);

export type LocalityZip = typeof localityZip.$inferSelect;
export type LocalityZipInsert = typeof localityZip.$inferInsert;
