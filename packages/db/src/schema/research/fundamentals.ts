import {
  bigint,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { agentSelectPublic, appFullAccess } from "../rls";
import { tickers } from "./tickers";

export const fundamentals = pgTable.withRLS(
  "fundamentals",
  {
    // Analyst consensus (FMP grades-consensus, 2x daily)
    analystBuy: integer("analyst_buy"),
    analystConsensus: text("analyst_consensus"),
    analystHold: integer("analyst_hold"),
    analystSell: integer("analyst_sell"),
    analystStrongBuy: integer("analyst_strong_buy"),
    analystStrongSell: integer("analyst_strong_sell"),
    analystSyncedAt: timestamp("analyst_synced_at", { withTimezone: true }),
    capex: bigint("capex", { mode: "bigint" }),
    cash: bigint("cash", { mode: "bigint" }),

    // Company profile (FMP profile, monthly; sicCode from SEC submissions)
    ceo: text("ceo"),
    companyName: text("company_name"),
    description: text("description"),
    employees: integer("employees"),
    eps: numeric("eps", { precision: 10, scale: 4 }),
    financialsSyncedAt: timestamp("financials_synced_at", {
      withTimezone: true,
    }),
    fiscalYearEnd: date("fiscal_year_end"),
    grossProfit: bigint("gross_profit", { mode: "bigint" }),
    industry: text("industry"),
    ipoDate: date("ipo_date"),
    longTermDebt: bigint("long_term_debt", { mode: "bigint" }),
    netIncome: bigint("net_income", { mode: "bigint" }),
    // Next scheduled earnings report date (from Nasdaq earnings calendar)
    nextEarningsDate: date("next_earnings_date"),
    operatingCashFlow: bigint("operating_cash_flow", { mode: "bigint" }),
    operatingIncome: bigint("operating_income", { mode: "bigint" }),

    // Per-category sync timestamps (for staleness detection + resumability)
    profileSyncedAt: timestamp("profile_synced_at", { withTimezone: true }),

    // Financials (SEC EDGAR companyfacts, weekly)
    revenue: bigint("revenue", { mode: "bigint" }),
    sector: text("sector"),
    sharesOutstandingDiluted: bigint("shares_outstanding_diluted", {
      mode: "bigint",
    }),
    sicCode: text("sic_code"),
    stockholdersEquity: bigint("stockholders_equity", { mode: "bigint" }),
    symbol: text("symbol")
      .primaryKey()
      .references(() => tickers.symbol, { onDelete: "cascade" }),
    totalAssets: bigint("total_assets", { mode: "bigint" }),
    totalLiabilities: bigint("total_liabilities", { mode: "bigint" }),
    website: text("website"),
  },
  () => [appFullAccess(), agentSelectPublic()]
);

export type Fundamentals = typeof fundamentals.$inferSelect;
export type FundamentalsInsert = typeof fundamentals.$inferInsert;
