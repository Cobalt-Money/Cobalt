import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { enrichmentSchema } from "./_schema";

/**
 * SRI-354 — canonical POI directory.
 *
 * One row per real-world place. Brand fields (`brand_*`) are denormalized so
 * the enrichment pipeline (SRI-353) reads a single row and copies straight
 * onto the transaction without a brand-table join. Cross-source duplicates
 * collapse during import via (brand_key, postal_code, address) similarity;
 * surviving merged rows record their provenance in `also_seen_in`.
 *
 * Server-only; not synced to Zero. Replaces SRI-352 merchant + merchant_location.
 */
export const place = enrichmentSchema.table(
  "place",
  {
    /** USPS / Overture address line. */
    address: text("address").notNull(),
    /** Stable provenance list of merged duplicates: [{ source, sourceId }, ...]. */
    alsoSeenIn: jsonb("also_seen_in")
      .$type<{ source: string; sourceId: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Brand domain (lowercase, no scheme/path). Drives Brandfetch logo. */
    brandDomain: text("brand_domain"),
    /** Slug for cross-source grouping (e.g. `starbucks`). Lowercase, [a-z0-9_]. */
    brandKey: text("brand_key").notNull(),
    /** CDN-hosted logo override; null = derive from `brand_domain` via Brandfetch. */
    brandLogoUrl: text("brand_logo_url"),
    /** Display brand name (e.g. `Starbucks`). Repeats across rows of same `brand_key`. */
    brandName: text("brand_name").notNull(),
    /** Lower / punctuation-stripped / suffix-stripped — trgm match column. */
    brandNameCompact: text("brand_name_compact").notNull(),
    /** Lower / punctuation-stripped — second trgm column for word-similarity hits. */
    brandNameNormalized: text("brand_name_normalized").notNull(),
    /** Overture top-level category (e.g. `restaurant`, `grocery_store`). */
    category: text("category").notNull(),
    /** USPS-canonical city. For NYC ZIPs this is the borough literal. */
    city: text("city").notNull(),
    country: text("country").notNull().default("US"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Soft active flag — flipped to false when a source marks the POI closed. */
    isActive: boolean("is_active").notNull().default(true),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    phone: text("phone"),
    /** 5-digit US ZIP (no +4 suffix). */
    postalCode: text("postal_code"),
    /** Original brand string from the source — kept for audit / debug. */
    rawName: text("raw_name").notNull(),
    /** US state code (or ISO region). */
    region: text("region").notNull(),
    /** Importer name: `overture` | `nyc_dohmh` | `seed` | etc. */
    source: text("source").notNull(),
    /** Stable per-source ID — Overture id, CAMIS, license number, OSM node id. */
    sourceId: text("source_id").notNull(),
    /** Source's own update timestamp — drives refresh decisions. */
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    /** Chain store number (e.g. Starbucks #4823). Strong disambiguator. */
    storeNumber: text("store_number"),
    /** Overture sub-category (e.g. `coffee_shop`, `supermarket`). */
    subtype: text("subtype"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("place_source_uniq").on(t.source, t.sourceId),
    index("place_brand_key_idx")
      .on(t.brandKey)
      .where(sql`(deleted_at IS NULL)`),
    index("place_brand_name_normalized_trgm")
      .using("gin", sql`${t.brandNameNormalized} gin_trgm_ops`)
      .where(sql`(deleted_at IS NULL)`),
    index("place_brand_name_compact_trgm")
      .using("gin", sql`${t.brandNameCompact} gin_trgm_ops`)
      .where(sql`(deleted_at IS NULL)`),
    index("place_region_city_idx")
      .on(t.region, t.city)
      .where(sql`(deleted_at IS NULL)`),
    index("place_postal_region_idx")
      .on(t.postalCode, t.region)
      .where(sql`(postal_code IS NOT NULL AND deleted_at IS NULL)`),
    index("place_store_number_idx")
      .on(t.brandKey, t.storeNumber)
      .where(sql`(store_number IS NOT NULL AND deleted_at IS NULL)`),
    index("place_geo_idx")
      .using("gist", sql`ll_to_earth(lat, lon)`)
      .where(sql`(lat IS NOT NULL AND lon IS NOT NULL AND deleted_at IS NULL)`),
    index("place_category_idx")
      .on(t.category)
      .where(sql`(deleted_at IS NULL)`),
    index("place_brand_domain_idx")
      .on(t.brandDomain)
      .where(sql`(brand_domain IS NOT NULL AND deleted_at IS NULL)`),
  ],
);

export type Place = typeof place.$inferSelect;
export type PlaceInsert = typeof place.$inferInsert;
