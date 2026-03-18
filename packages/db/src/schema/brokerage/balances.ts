import {
  index,
  uniqueIndex,
  decimal,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { brokerageAccounts } from "./accounts";

export const brokerageBalances = pgTable(
  "brokerage_balance",
  {
    accountId: uuid("account_id")
      .references(() => brokerageAccounts.id, { onDelete: "cascade" })
      .notNull(),
    buyingPower: decimal("buying_power", { precision: 15, scale: 2 }),
    cash: decimal("cash", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),
    currencyCode: varchar("currency_code"),
    currencyId: varchar("currency_id"),
    currencyName: varchar("currency_name"),
    id: uuid("id").defaultRandom().primaryKey(),
    lastSync: timestamp("last_sync"),
    snapTradeAccountId: varchar("snaptrade_account_id").notNull(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("brokerage_balance_account_id_idx").on(table.accountId),
    index("brokerage_balance_user_id_idx").on(table.userId),
    index("brokerage_balance_snaptrade_account_id_idx").on(
      table.snapTradeAccountId
    ),
    index("brokerage_balance_currency_code_idx").on(table.currencyCode),
    uniqueIndex("brokerage_balance_account_currency_idx").on(
      table.accountId,
      table.currencyCode
    ),
  ]
);

export const brokeragePositions = pgTable(
  "brokerage_position",
  {
    accountId: uuid("account_id")
      .references(() => brokerageAccounts.id, { onDelete: "cascade" })
      .notNull(),
    averagePurchasePrice: decimal("average_purchase_price", {
      precision: 15,
      scale: 4,
    }),
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
    figiCode: varchar("figi_code"),
    id: uuid("id").defaultRandom().primaryKey(),

    isQuotable: boolean("is_quotable").$default(() => true),
    isTradable: boolean("is_tradable").$default(() => true),
    lastSync: timestamp("last_sync"),

    localId: varchar("local_id"),
    openPnl: decimal("open_pnl", { precision: 15, scale: 2 }),
    price: decimal("price", { precision: 15, scale: 2 }),
    rawSymbol: varchar("raw_symbol"),

    securityTypeCode: varchar("security_type_code"),
    securityTypeDescription: varchar("security_type_description"),
    securityTypeId: varchar("security_type_id"),

    snapTradeAccountId: varchar("snap_trade_account_id").notNull(),
    symbol: varchar("symbol"),
    symbolDescription: varchar("symbol_description"),
    symbolId: varchar("symbol_id"),

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
    index("brokerage_position_account_id_idx").on(table.accountId),
    index("brokerage_position_user_id_idx").on(table.userId),
    index("brokerage_position_symbol_idx").on(table.symbol),
    index("brokerage_position_snap_trade_account_id_idx").on(
      table.snapTradeAccountId
    ),
    uniqueIndex("brokerage_position_account_symbol_idx").on(
      table.accountId,
      table.symbol
    ),
  ]
);

// Type exports
export type BrokerageBalance = typeof brokerageBalances.$inferSelect;
export type BrokerageBalanceInsert = typeof brokerageBalances.$inferInsert;
export type BrokeragePosition = typeof brokeragePositions.$inferSelect;
export type BrokeragePositionInsert = typeof brokeragePositions.$inferInsert;
