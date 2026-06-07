import { sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { merchant } from "./merchant";

/**
 * SRI-352 — physical place row. One row per real-world store.
 *
 * Phase 1 importers populate raw rows with merchant_id NULL + raw_name set.
 * Phase 2 (dedup) collapses cross-source duplicates by region + zip + address
 * similarity + 100m geo proximity. Phase 3 (rollup) clusters surviving rows
 * into merchant brands and backfills merchant_id.
 *
 * Phone is informational only — never used as a dedup match key.
 */
export const merchantLocation = pgTable(
  "merchant_location",
  {
    address: text("address").notNull(),
    /** Cross-source provenance: [{ source, source_id }, ...] of merged duplicates. */
    alsoSeenIn: jsonb("also_seen_in")
      .$type<{ source: string; source_id: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    city: text("city").notNull(),
    country: text("country").notNull().default("US"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Set by rollup. NULL between import and rollup. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    merchantId: uuid("merchant_id").references(() => merchant.id, { onDelete: "cascade" }),
    phone: text("phone"),
    postalCode: text("postal_code"),
    /** Brand name from source — drives rollup clustering. Distinct from merchant.canonicalName until rollup runs. */
    rawName: text("raw_name").notNull(),
    /** US state code (or ISO region). */
    region: text("region").notNull(),
    /** Importer name: "nyc_dohmh" | "ny_retail_food" | "la_county" | "sf_dph" | "osm". */
    source: text("source").notNull(),
    /** Stable per-source ID — CAMIS, license number, OSM node id, etc. */
    sourceId: text("source_id").notNull(),
    /** Chain store number from source (e.g. Starbucks #4823). Strong disambiguator. */
    storeNumber: text("store_number"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("merchant_location_source_uniq").on(t.source, t.sourceId),
    index("merchant_location_merchant_idx").on(t.merchantId),
    index("merchant_location_region_city_idx").on(t.region, t.city),
    index("merchant_location_postal_region_idx").on(t.postalCode, t.region),
    index("merchant_location_store_number_idx")
      .on(t.storeNumber)
      .where(sql`(store_number IS NOT NULL)`),
    index("merchant_location_geo_idx").using("gist", sql`ll_to_earth(lat, lon)`),
  ],
);

export type MerchantLocation = typeof merchantLocation.$inferSelect;
export type MerchantLocationInsert = typeof merchantLocation.$inferInsert;
