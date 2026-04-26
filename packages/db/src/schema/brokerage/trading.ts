import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { appFullAccess, agentSelectOwn } from "../rls";
import { brokerageAccounts } from "./accounts";

/** @deprecated Use `orders` from `@cobalt-web/db/schema/accounts/order`. */
export const brokerageOrders = pgTable.withRLS(
  "brokerage_order",
  {
    accountId: uuid("account_id")
      .references(() => brokerageAccounts.id, { onDelete: "cascade" })
      .notNull(),
    action: varchar("action"),
    brokerageOrderId: varchar("brokerage_order_id").notNull().unique(),
    canceledQuantity: decimal("canceled_quantity", {
      precision: 15,
      scale: 6,
    }),

    childBrokerageOrderIds: jsonb("child_brokerage_order_ids"),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),

    currencyCode: varchar("currency_code"),
    currencyId: varchar("currency_id"),
    currencyName: varchar("currency_name"),
    exchangeCode: varchar("exchange_code"),

    exchangeId: varchar("exchange_id"),
    exchangeMicCode: varchar("exchange_mic_code"),
    exchangeName: varchar("exchange_name"),
    executionPrice: decimal("execution_price", { precision: 15, scale: 2 }),
    expirationDate: timestamp("expiration_date"),
    expiryDate: timestamp("expiry_date"),
    figiCode: varchar("figi_code"),
    filledQuantity: decimal("filled_quantity", { precision: 15, scale: 6 }),
    id: uuid("id").defaultRandom().primaryKey(),
    isMiniOption: boolean("is_mini_option").$default(() => false),

    lastSync: timestamp("last_sync"),
    limitPrice: decimal("limit_price", { precision: 15, scale: 2 }),
    openQuantity: decimal("open_quantity", { precision: 15, scale: 6 }),
    optionSymbol: jsonb("option_symbol"),

    optionType: varchar("option_type"),
    orderType: varchar("order_type"),
    quoteCurrency: jsonb("quote_currency"),

    quoteUniversalSymbol: jsonb("quote_universal_symbol"),
    rawSymbol: varchar("raw_symbol"),
    securityTypeCode: varchar("security_type_code"),
    securityTypeDescription: varchar("security_type_description"),

    securityTypeId: varchar("security_type_id"),
    snapTradeAccountId: varchar("snap_trade_account_id").notNull(),
    status: varchar("status"),

    stopPrice: decimal("stop_price", { precision: 15, scale: 2 }),

    strikePrice: decimal("strike_price", { precision: 15, scale: 2 }),
    symbol: varchar("symbol"),
    symbolDescription: varchar("symbol_description"),
    symbolId: varchar("symbol_id"),
    timeExecuted: timestamp("time_executed"),

    timeInForce: varchar("time_in_force"),

    timePlaced: timestamp("time_placed"),
    timeUpdated: timestamp("time_updated"),
    totalQuantity: decimal("total_quantity", { precision: 15, scale: 6 }),

    universalSymbol: jsonb("universal_symbol"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("brokerage_order_account_id_idx").on(table.accountId),
    index("brokerage_order_user_id_idx").on(table.userId),
    index("brokerage_order_brokerage_order_id_idx").on(table.brokerageOrderId),
    index("brokerage_order_snap_trade_account_id_idx").on(
      table.snapTradeAccountId
    ),
    index("brokerage_order_status_idx").on(table.status),
    index("brokerage_order_symbol_idx").on(table.symbol),
    index("brokerage_order_time_placed_idx").on(table.timePlaced),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

/** @deprecated Use `investmentActivity` from `@cobalt-web/db/schema/accounts/investment-activity`. */
export const brokerageActivities = pgTable.withRLS(
  "brokerage_activity",
  {
    accountId: uuid("account_id")
      .references(() => brokerageAccounts.id, { onDelete: "cascade" })
      .notNull(),
    activityId: varchar("activity_id").notNull().unique(),
    amount: decimal("amount", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),

    currencyCode: varchar("currency_code"),
    currencyId: varchar("currency_id"),

    currencyName: varchar("currency_name"),
    description: text("description"),
    exchangeCode: varchar("exchange_code"),
    exchangeId: varchar("exchange_id"),

    exchangeMicCode: varchar("exchange_mic_code"),
    exchangeName: varchar("exchange_name"),
    externalReferenceId: varchar("external_reference_id"),
    fee: decimal("fee", { precision: 15, scale: 2 }),
    figiCode: varchar("figi_code"),

    fxRate: decimal("fx_rate", { precision: 15, scale: 6 }),
    id: uuid("id").defaultRandom().primaryKey(),

    institution: varchar("institution"),
    lastSync: timestamp("last_sync"),
    optionSymbol: jsonb("option_symbol"),

    optionType: varchar("option_type"),
    pagination: jsonb("pagination"),
    price: decimal("price", { precision: 15, scale: 4 }),
    rawSymbol: varchar("raw_symbol"),

    securityTypeCode: varchar("security_type_code"),
    securityTypeDescription: varchar("security_type_description"),
    securityTypeId: varchar("security_type_id"),

    settlementDate: date("settlement_date"),

    snapTradeAccountId: varchar("snap_trade_account_id").notNull(),
    symbol: jsonb("symbol"),

    symbolDescription: varchar("symbol_description"),
    symbolId: varchar("symbol_id"),
    symbolTicker: varchar("symbol_ticker"),

    tradeDate: date("trade_date"),
    type: varchar("type"),

    units: decimal("units", { precision: 15, scale: 6 }),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("brokerage_activity_account_id_idx").on(table.accountId),
    index("brokerage_activity_user_id_idx").on(table.userId),
    index("brokerage_activity_activity_id_idx").on(table.activityId),
    index("brokerage_activity_snap_trade_account_id_idx").on(
      table.snapTradeAccountId
    ),
    index("brokerage_activity_type_idx").on(table.type),
    index("brokerage_activity_symbol_ticker_idx").on(table.symbolTicker),
    index("brokerage_activity_trade_date_idx").on(table.tradeDate),
    index("brokerage_activity_settlement_date_idx").on(table.settlementDate),
    index("brokerage_activity_user_trade_date_idx").on(
      table.userId,
      table.tradeDate
    ),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

// Type exports
export type BrokerageOrder = typeof brokerageOrders.$inferSelect;
export type BrokerageOrderInsert = typeof brokerageOrders.$inferInsert;
export type BrokerageActivity = typeof brokerageActivities.$inferSelect;
export type BrokerageActivityInsert = typeof brokerageActivities.$inferInsert;
