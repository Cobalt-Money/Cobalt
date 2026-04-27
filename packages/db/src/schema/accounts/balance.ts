import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";
import { financialAccount } from "./account";

export const balance = pgTable(
  "balance",
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
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    limit: numeric("limit", { precision: 19, scale: 4 }),
    unofficialCurrencyCode: text("unofficial_currency_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userOverrideCreditLimit: numeric("user_override_credit_limit", {
      precision: 19,
      scale: 4,
    }),
  },
  (t) => [
    uniqueIndex("balance_account_id_unique").on(t.accountId),
    index("balance_user_id_idx").on(t.userId),
    index("balance_account_updated_idx").on(t.accountId, t.updatedAt),
  ]
);

export type Balance = typeof balance.$inferSelect;
export type BalanceInsert = typeof balance.$inferInsert;
