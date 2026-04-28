import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tickers = pgTable(
  "tickers",
  {
    cik: text("cik"),
    country: text("country"),
    currency: text("currency"),
    exchange: text("exchange").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    symbol: text("symbol").primaryKey(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .$default(() => new Date()),
    type: text("type").notNull(),
  },
  (table) => [
    index("tickers_exchange_idx").on(table.exchange),
    index("tickers_cik_idx").on(table.cik),
    index("tickers_is_active_idx").on(table.isActive),
  ]
);

export type Ticker = typeof tickers.$inferSelect;
export type TickerInsert = typeof tickers.$inferInsert;
