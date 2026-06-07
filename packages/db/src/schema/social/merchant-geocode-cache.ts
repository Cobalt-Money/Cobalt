import { doublePrecision, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Cross-user geocode cache keyed by (merchant_name, city). Populated by the
 * share-time geocode worker (Mapbox/Google Places). Server-only — never
 * synced to Zero. Reused across all users sharing the same merchant to
 * keep API spend flat regardless of share volume.
 *
 * Cold path on first share for a (merchant_name, city) pair; hot path
 * cache hit forever after.
 */
export const merchantGeocodeCache = pgTable(
  "merchant_geocode_cache",
  {
    city: text("city"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    merchantName: text("merchant_name").notNull(),
    /** 'mapbox' | 'google' | 'manual' */
    provider: text("provider").notNull(),
  },
  (table) => [uniqueIndex("merchant_geocode_cache_key_uq").on(table.merchantName, table.city)],
);
