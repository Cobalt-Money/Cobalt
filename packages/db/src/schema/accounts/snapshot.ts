import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";
import { accountSource, financialAccount } from "./account";

export const snapshot = pgTable(
  "snapshot",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    available: numeric("available", { precision: 19, scale: 4 }),
    buyingPower: numeric("buying_power", { precision: 19, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    current: numeric("current", { precision: 19, scale: 4 }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isoCurrencyCode: text("iso_currency_code"),
    limit: numeric("limit", { precision: 19, scale: 4 }),
    positionsCount: integer("positions_count"),
    positionsValue: numeric("positions_value", { precision: 19, scale: 4 }),
    snapshotDate: date("snapshot_date").notNull(),
    source: accountSource("source"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("snapshot_account_id_idx").on(t.accountId),
    index("snapshot_user_id_idx").on(t.userId),
    index("snapshot_date_idx").on(t.snapshotDate),
    uniqueIndex("snapshot_account_date_idx").on(t.accountId, t.snapshotDate),
  ]
);

export type Snapshot = typeof snapshot.$inferSelect;
export type SnapshotInsert = typeof snapshot.$inferInsert;
