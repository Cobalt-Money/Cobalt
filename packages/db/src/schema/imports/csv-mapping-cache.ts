import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";
import type { CsvMapping } from "./import-job";

/**
 * Per-user cache of confirmed column mappings keyed by header signature.
 * One Haiku call per (user × unique header layout) lifetime — re-imports of the
 * same export format hit cache and skip AI entirely.
 */
export const csvMappingCache = pgTable(
  "csv_mapping_cache",
  {
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow().notNull(),
    /** sha256 of normalized header list, joined by `|`. */
    headerHash: text("header_hash").notNull(),
    mapping: jsonb("mapping").$type<CsvMapping>().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.headerHash] })],
);

export type CsvMappingCache = typeof csvMappingCache.$inferSelect;
