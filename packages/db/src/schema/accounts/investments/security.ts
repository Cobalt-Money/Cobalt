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

export const securitySource = pgEnum("security_source", ["plaid", "snaptrade", "manual"]);

export const security = pgTable(
  "security",
  {
    closePrice: numeric("close_price", { precision: 28, scale: 10 }),
    closePriceAsOf: date("close_price_as_of"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    currency: text("currency"),
    // cusip/isin/sedol: cross-broker security IDs. Currently always null —
    // Plaid gates these behind a CUSIP Global Services license (null by
    // default for new customers since 2024-03-12); SnapTrade doesn't send
    // them at all. Kept for future use if we ever license CUSIP. Today,
    // figi_code (SnapTrade) + ticker_symbol are the only populated IDs.
    cusip: text("cusip"),
    exchangeCode: text("exchange_code"),
    exchangeName: text("exchange_name"),
    externalId: text("external_id"),
    figiCode: text("figi_code"),
    // fixed_income / option_contract: type-specific Plaid jsonb. Only
    // populated for bond and option securities respectively; null for
    // stocks/ETFs (the bulk of holdings).
    fixedIncome: jsonb("fixed_income"),
    id: uuid("id").defaultRandom().primaryKey(),
    industry: text("industry"),
    // institution_id / institution_security_id: a pair from Plaid. Set when
    // the broker has its own internal security ID and Plaid relays it; most
    // retail brokers don't, so usually null.
    institutionId: text("institution_id"),
    institutionSecurityId: text("institution_security_id"),
    // True for money-market funds, sweep accounts, T-bills — securities that
    // act like cash for holdings/balance views.
    isCashEquivalent: boolean("is_cash_equivalent"),
    isin: text("isin"),
    marketIdentifierCode: text("market_identifier_code"),
    name: text("name"),
    optionContract: jsonb("option_contract"),
    // Plaid only: ID of a similar security used as a stand-in when the
    // original is thinly traded or private (e.g., a private startup share
    // proxied by a comparable public ETF). Rare.
    proxySecurityId: text("proxy_security_id"),
    sector: text("sector"),
    sedol: text("sedol"),
    source: securitySource("source").notNull(),
    subtype: text("subtype"),
    tickerSymbol: text("ticker_symbol"),
    type: text("type"),
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
  ],
);

export type Security = typeof security.$inferSelect;
export type SecurityInsert = typeof security.$inferInsert;
