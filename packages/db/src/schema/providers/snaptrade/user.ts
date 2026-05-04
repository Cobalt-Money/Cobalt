import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../../users/auth/auth";

export const snaptradeUser = pgTable(
  "snaptrade_user",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    snaptradeUserId: text("snaptrade_user_id").notNull().unique(),
    snaptradeUserSecret: text("snaptrade_user_secret").notNull(),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("snaptrade_user_snaptrade_user_id_idx").on(t.snaptradeUserId)],
);

export type SnaptradeUser = typeof snaptradeUser.$inferSelect;
export type SnaptradeUserInsert = typeof snaptradeUser.$inferInsert;
