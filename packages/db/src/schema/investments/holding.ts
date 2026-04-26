import {
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { securitySource } from "../accounts/enums";
import { financialAccount } from "../accounts/financial-account";
import { user } from "../auth/auth";
import { security } from "./security";

export const holding = pgTable(
  "holding",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    averagePrice: numeric("average_price", { precision: 28, scale: 10 }),
    costBasis: numeric("cost_basis", { precision: 19, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionPrice: numeric("institution_price", {
      precision: 28,
      scale: 10,
    }),
    institutionPriceAsOf: date("institution_price_as_of"),
    institutionPriceDatetime: timestamp("institution_price_datetime", {
      withTimezone: true,
    }),
    institutionValue: numeric("institution_value", { precision: 19, scale: 4 }),
    isQuotable: boolean("is_quotable"),
    isTradable: boolean("is_tradable"),
    isoCurrencyCode: text("iso_currency_code"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    openPnl: numeric("open_pnl", { precision: 19, scale: 4 }),
    quantity: numeric("quantity", { precision: 28, scale: 10 }).notNull(),
    securityId: uuid("security_id")
      .notNull()
      .references(() => security.id, { onDelete: "cascade" }),
    source: securitySource("source").notNull(),
    unofficialCurrencyCode: text("unofficial_currency_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vestedQuantity: numeric("vested_quantity", { precision: 28, scale: 10 }),
    vestedValue: numeric("vested_value", { precision: 19, scale: 4 }),
  },
  (t) => [
    index("holding_account_id_idx").on(t.accountId),
    index("holding_user_id_idx").on(t.userId),
    index("holding_security_id_idx").on(t.securityId),
    uniqueIndex("holding_account_security_idx").on(t.accountId, t.securityId),
  ]
);

export type Holding = typeof holding.$inferSelect;
export type HoldingInsert = typeof holding.$inferInsert;
