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

import { user } from "../../users/auth/auth";
import { financialAccount } from "../account";
import { security, securitySource } from "./security";

export const holding = pgTable(
  "holding",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    /** Average purchase price per share (SnapTrade). */
    averagePrice: numeric("average_price", { precision: 28, scale: 10 }),
    /** Total cost basis (sum of purchase prices). */
    costBasis: numeric("cost_basis", { precision: 19, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** ISO-4217 currency code. */
    currency: text("currency"),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Last price reported by the broker. */
    institutionPrice: numeric("institution_price", {
      precision: 28,
      scale: 10,
    }),
    /** Date `institution_price` was current. */
    institutionPriceAsOf: date("institution_price_as_of"),
    /** Timestamp of `institution_price`; rarely populated. */
    institutionPriceDatetime: timestamp("institution_price_datetime", {
      withTimezone: true,
    }),
    /** Holding value as reported by the broker. */
    institutionValue: numeric("institution_value", { precision: 19, scale: 4 }),
    /** SnapTrade: broker provides a current quote for this security. */
    isQuotable: boolean("is_quotable"),
    /** SnapTrade: broker accepts trades on this security. */
    isTradable: boolean("is_tradable"),
    /** Last refresh from the provider. */
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    /** SnapTrade: unrealized P&L from broker. */
    openPnl: numeric("open_pnl", { precision: 19, scale: 4 }),
    /** Total shares held (includes unvested). */
    quantity: numeric("quantity", { precision: 28, scale: 10 }).notNull(),
    securityId: uuid("security_id")
      .notNull()
      .references(() => security.id, { onDelete: "cascade" }),
    /** plaid | snaptrade | manual. */
    source: securitySource("source").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Sellable shares (vested portion of grant). 0/13 in prod; SRI-284. */
    vestedQuantity: numeric("vested_quantity", { precision: 28, scale: 10 }),
    /** Sellable dollar value of vested shares. SRI-284. */
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
