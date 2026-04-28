import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../users/auth/auth";
import { financialAccount } from "../account";
import { security } from "./security";

/**
 * Brokerage orders (pending/historical). SnapTrade-only — no Plaid equivalent.
 * Renamed from `brokerage_order`.
 */
export const orders = pgTable(
  "orders",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    action: text("action"),
    canceledQuantity: numeric("canceled_quantity", {
      precision: 28,
      scale: 10,
    }),
    childBrokerageOrderIds: jsonb("child_brokerage_order_ids"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currency: text("currency"),
    executionPrice: numeric("execution_price", { precision: 28, scale: 10 }),
    expirationDate: timestamp("expiration_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    externalId: text("external_id").notNull().unique(),
    filledQuantity: numeric("filled_quantity", { precision: 28, scale: 10 }),
    id: uuid("id").defaultRandom().primaryKey(),
    isMiniOption: boolean("is_mini_option"),
    limitPrice: numeric("limit_price", { precision: 28, scale: 10 }),
    openQuantity: numeric("open_quantity", { precision: 28, scale: 10 }),
    optionSymbol: jsonb("option_symbol"),
    optionType: text("option_type"),
    orderType: text("order_type"),
    securityId: uuid("security_id").references(() => security.id, {
      onDelete: "set null",
    }),
    status: text("status"),
    stopPrice: numeric("stop_price", { precision: 28, scale: 10 }),
    strikePrice: numeric("strike_price", { precision: 28, scale: 10 }),
    timeExecuted: timestamp("time_executed", { withTimezone: true }),
    timeInForce: text("time_in_force"),
    timePlaced: timestamp("time_placed", { withTimezone: true }),
    timeUpdated: timestamp("time_updated", { withTimezone: true }),
    totalQuantity: numeric("total_quantity", { precision: 28, scale: 10 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("orders_account_id_idx").on(t.accountId),
    index("orders_user_id_idx").on(t.userId),
    index("orders_security_id_idx").on(t.securityId),
    index("orders_status_idx").on(t.status),
    index("orders_time_placed_idx").on(t.timePlaced),
  ]
);

export type Order = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
