import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Per-header column-role override. Written when the user confirms Step 2 of
 * the import wizard — one row per CSV header. Future imports look up each
 * header's role individually so partial overlap between CSVs (e.g. Mint
 * exports with optional `Labels`/`Notes` columns) still skips the AI agent
 * for the headers it already knows.
 *
 * `header_name` is normalized via `header.trim().toLowerCase()`; the original
 * casing is taken from the *current* upload's headers at reconstruction time.
 *
 * `meta` shape depends on `role`:
 *   - date              → { format }
 *   - amount_signed     → { signConvention, parensNegative }
 *   - amount_magnitude  → { typeHeaderName }
 *   - amount_type       → { debitValues, magnitudeHeaderName }
 *   - amount_split_*    → {} (paired by the other split role)
 *   - tags              → { delimiter }
 *   - exclude_rule      → { trueValues }
 *   - transfer_rule_*   → { values }
 *   - merchant/account/category/notes/original_description/ignore → null
 */
export const csvColumnRoleCache = pgTable(
  "csv_column_role_cache",
  {
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow().notNull(),
    headerName: text("header_name").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    role: text("role").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.headerName] })],
);

export type CsvColumnRoleCache = typeof csvColumnRoleCache.$inferSelect;
