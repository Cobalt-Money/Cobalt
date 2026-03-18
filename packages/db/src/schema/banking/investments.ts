import {
  pgTable,
  text,
  varchar,
  jsonb,
  real,
  index,
  uniqueIndex,
  boolean,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

import { bankAccount } from "./accounts";

// Investment Securities
export const investmentSecurity = pgTable(
  "investment_security",
  {
    closePrice: real("close_price"),
    closePriceAsOf: text("close_price_as_of"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    cusip: text("cusip"),
    fixedIncome: jsonb("fixed_income"),
    id: uuid("id").defaultRandom().primaryKey(),
    industry: varchar("industry"),
    institutionId: text("institution_id"),

    institutionSecurityId: text("institution_security_id"),
    isCashEquivalent: boolean("is_cash_equivalent"),
    isin: text("isin"),

    isoCurrencyCode: varchar("iso_currency_code"),
    marketIdentifierCode: varchar("market_identifier_code"),

    name: text("name"),
    optionContract: jsonb("option_contract"),
    proxySecurityId: text("proxy_security_id"),

    sector: varchar("sector"),
    securityId: text("security_id").notNull().unique(),

    sedol: text("sedol"),

    subtype: varchar("subtype"),
    tickerSymbol: varchar("ticker_symbol"),

    type: varchar("type"),
    unofficialCurrencyCode: varchar("unofficial_currency_code"),

    updateDatetime: text("update_datetime"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("investment_security_ticker_idx").on(table.tickerSymbol),
    index("investment_security_type_idx").on(table.type),
    index("investment_security_sector_idx").on(table.sector),
  ]
);

// Investment Holdings
export const investmentPosition = pgTable(
  "investment_position",
  {
    costBasis: real("cost_basis"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),

    institutionPrice: real("institution_price").notNull(),
    institutionPriceAsOf: text("institution_price_as_of"),
    institutionPriceDatetime: text("institution_price_datetime"),
    institutionValue: real("institution_value").notNull(),
    isoCurrencyCode: varchar("iso_currency_code"),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),

    quantity: real("quantity").notNull(),
    securityId: text("security_id")
      .notNull()
      .references(() => investmentSecurity.securityId, {
        onDelete: "cascade",
      }),

    unofficialCurrencyCode: varchar("unofficial_currency_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),

    vestedQuantity: real("vested_quantity"),
    vestedValue: real("vested_value"),
  },
  (table) => [
    index("investment_position_account_idx").on(table.plaidAccountId),
    index("investment_position_security_idx").on(table.securityId),
    uniqueIndex("investment_position_account_security_idx").on(
      table.plaidAccountId,
      table.securityId
    ),
  ]
);

// Investment Transactions
export const investmentActivity = pgTable(
  "investment_activity",
  {
    amount: real("amount").notNull(),
    cancelTransactionId: text("cancel_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    date: text("date").notNull(),

    fees: real("fees"),
    id: uuid("id").defaultRandom().primaryKey(),
    investmentTransactionId: text("investment_transaction_id")
      .notNull()
      .unique(),
    isoCurrencyCode: varchar("iso_currency_code"),

    name: text("name").notNull(),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    price: real("price").notNull(),
    quantity: real("quantity").notNull(),

    securityId: text("security_id").references(
      () => investmentSecurity.securityId,
      { onDelete: "set null" }
    ),
    subtype: varchar("subtype").notNull(),

    type: varchar("type").notNull(),

    unofficialCurrencyCode: varchar("unofficial_currency_code"),
  },
  (table) => [
    index("investment_activity_account_idx").on(table.plaidAccountId),
    index("investment_activity_date_idx").on(table.date),
    index("investment_activity_account_date_idx").on(
      table.plaidAccountId,
      table.date
    ),
    index("investment_activity_security_idx").on(table.securityId),
    index("investment_activity_type_idx").on(table.type),
  ]
);

// Type exports
export type InvestmentSecurity = typeof investmentSecurity.$inferInsert;
export type InvestmentSecuritySelect = typeof investmentSecurity.$inferSelect;
export type InvestmentPosition = typeof investmentPosition.$inferInsert;
export type InvestmentPositionSelect = typeof investmentPosition.$inferSelect;
export type InvestmentActivity = typeof investmentActivity.$inferInsert;
export type InvestmentActivitySelect = typeof investmentActivity.$inferSelect;
