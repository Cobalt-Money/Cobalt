import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";
import type { CsvMapping } from "./import-job";

/**
 * Per-user confirmed column mapping override — written when the user confirms
 * Step 2 of the import wizard. Looked up first for a header signature; falls
 * back to `csv_mapping_baseline` (global AI baseline) on miss.
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
