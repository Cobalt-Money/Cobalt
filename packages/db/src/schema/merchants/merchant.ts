import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * SRI-352 — canonical merchant directory.
 *
 * One row per brand (e.g. "Starbucks"). Locations live in merchant_location.
 * Server-only; not synced to Zero. Consumed by enrichment pipeline (SRI-350)
 * via lookup at txn write time. No FK from transaction → merchant; enrichment
 * copies fields onto the txn row.
 */
export const merchant = pgTable(
  "merchant",
  {
    /** User-mutable aliases (e.g. ["Sbux", "Starbux"]); trgm/array indexed. */
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`'{}'`),
    /** Display name picked by rollup (mode of raw_name across locations). */
    canonicalName: text("canonical_name").notNull(),
    /** Joins to category.system_key — drives default category at enrichment. */
    categorySystemKey: text("category_system_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** Brand domain (lowercase, no scheme/path). Drives Brandfetch logo. */
    domain: text("domain"),
    /** History of HEAD-guess attempts so domain-fill reruns skip dead candidates. */
    domainGuessAttempts: jsonb("domain_guess_attempts")
      .$type<{ domain: string; status: number | "err"; at: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Provenance of the domain value: "google_places" | "head_guess" | "osm" | "seed". */
    domainSource: text("domain_source"),
    id: uuid("id").defaultRandom().primaryKey(),
    /** ≥3 locations. Recomputed by rollup. */
    isChain: boolean("is_chain").notNull().default(false),
    /** Recomputed by rollup. */
    locationCount: integer("location_count").notNull().default(0),
    /** CDN-hosted logo override; null = derive from domain via Brandfetch. */
    logoUrl: text("logo_url"),
    /** Lowercase, punctuation-stripped, suffix-stripped; trgm-indexed for fuzzy match. */
    nameNormalized: text("name_normalized").notNull(),
    /** Google Places place_id for the canonical brand location. */
    placesId: text("places_id"),
    /** Vertical sub-classification (e.g. "coffee", "fast_casual"). */
    subtype: text("subtype"),
    /** Free-form tags for filtering (e.g. "vegan", "drive_thru"). */
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("merchant_name_trgm_idx").using("gin", sql`${t.nameNormalized} gin_trgm_ops`),
    index("merchant_aliases_gin_idx").using("gin", t.aliases),
    index("merchant_category_idx").on(t.categorySystemKey),
    index("merchant_tags_gin_idx").using("gin", t.tags),
    uniqueIndex("merchant_domain_uniq")
      .on(t.domain)
      .where(sql`(domain IS NOT NULL)`),
    uniqueIndex("merchant_name_normalized_uniq")
      .on(t.nameNormalized)
      .where(sql`(deleted_at IS NULL)`),
  ],
);

export type Merchant = typeof merchant.$inferSelect;
export type MerchantInsert = typeof merchant.$inferInsert;
