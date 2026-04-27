import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const securitySource = pgEnum("security_source", [
  "plaid",
  "snaptrade",
  "manual",
]);

export const security = pgTable(
  "security",
  {
    closePrice: numeric("close_price", { precision: 28, scale: 10 }),
    closePriceAsOf: date("close_price_as_of"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    cusip: text("cusip"),
    exchangeCode: text("exchange_code"),
    exchangeName: text("exchange_name"),
    externalId: text("external_id"),
    figiCode: text("figi_code"),
    fixedIncome: jsonb("fixed_income"),
    id: uuid("id").defaultRandom().primaryKey(),
    industry: text("industry"),
    institutionId: text("institution_id"),
    institutionSecurityId: text("institution_security_id"),
    isCashEquivalent: boolean("is_cash_equivalent"),
    isin: text("isin"),
    isoCurrencyCode: text("iso_currency_code"),
    marketIdentifierCode: text("market_identifier_code"),
    name: text("name"),
    optionContract: jsonb("option_contract"),
    proxySecurityId: text("proxy_security_id"),
    sector: text("sector"),
    sedol: text("sedol"),
    source: securitySource("source").notNull(),
    subtype: text("subtype"),
    tickerSymbol: text("ticker_symbol"),
    type: text("type"),
    unofficialCurrencyCode: text("unofficial_currency_code"),
    updateDatetime: timestamp("update_datetime", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("security_ticker_idx").on(t.tickerSymbol),
    index("security_figi_idx").on(t.figiCode),
    index("security_cusip_idx").on(t.cusip),
    index("security_type_idx").on(t.type),
    index("security_sector_idx").on(t.sector),
    uniqueIndex("security_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
  ]
);

export type Security = typeof security.$inferSelect;
export type SecurityInsert = typeof security.$inferInsert;
