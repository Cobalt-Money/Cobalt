import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { financialAccount } from "../accounts/account";
import { user } from "../users/auth/auth";

/**
 * Per-user cache of confirmed source-account-label → Cobalt account choices.
 * `cobaltAccountId` is null when the user picked "skip" for that label.
 */
export const accountMappingCache = pgTable(
  "account_mapping_cache",
  {
    cobaltAccountId: uuid("cobalt_account_id").references(() => financialAccount.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow().notNull(),
    sourceLabel: text("source_label").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sourceLabel] })],
);

export type AccountMappingCache = typeof accountMappingCache.$inferSelect;
