/**
 * Data layer for the fundamentals refresh cron.
 *
 * All FMP fetching, Nasdaq calendar parsing, field mapping, and DB upserts
 * live here. The cron workflow in apps/server imports these and wraps them
 * in "use step" / "use workflow" directives.
 */

import { fmpStableGet } from "@cobalt-web/clients/fmp";
import { db } from "@cobalt-web/db";
import { fundamentals } from "@cobalt-web/db/schema/research/fundamentals";
import type { FundamentalsInsert } from "@cobalt-web/db/schema/research/fundamentals";
import { and, inArray, isNotNull, lt, or, sql } from "drizzle-orm";

// ── Internal helpers ──────────────────────────────────────────────────────────

function firstRow(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw[0] as Record<string, unknown>;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function num(v: unknown): bigint | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return BigInt(Math.round(v));
  }
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) {
      return BigInt(Math.round(n));
    }
  }
  return null;
}

function numDecimal(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) {
      return String(n);
    }
  }
  return null;
}

function int(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.round(v);
  }
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function mapIncomeFields(
  income: Record<string, unknown>,
  now: Date
): Partial<FundamentalsInsert> {
  return {
    eps: numDecimal(income.epsDiluted ?? income.eps),
    financialsSyncedAt: now,
    grossProfit: num(income.grossProfit),
    netIncome: num(income.netIncome),
    operatingIncome: num(income.operatingIncome),
    revenue: num(income.revenue),
    sharesOutstandingDiluted: num(
      income.weightedAverageShsOutDil ?? income.weightedAverageShsOut
    ),
  };
}

function mapBalanceFields(
  balance: Record<string, unknown>
): Partial<FundamentalsInsert> {
  return {
    cash: num(balance.cashAndCashEquivalents),
    longTermDebt: num(balance.longTermDebt),
    stockholdersEquity: num(balance.totalStockholdersEquity),
    totalAssets: num(balance.totalAssets),
    totalLiabilities: num(balance.totalLiabilities),
  };
}

function mapGradesFields(
  grades: Record<string, unknown>,
  now: Date
): Partial<FundamentalsInsert> {
  return {
    analystBuy: int(grades.buy),
    analystConsensus: str(grades.consensus),
    analystHold: int(grades.hold),
    analystSell: int(grades.sell),
    analystStrongBuy: int(grades.strongBuy),
    analystStrongSell: int(grades.strongSell),
    analystSyncedAt: now,
  };
}

// ── Nasdaq earnings calendar ──────────────────────────────────────────────────

/**
 * Returns symbols reporting earnings that should be refreshed:
 * - Pre-market reporters for todayStr (numbers already out by 8am ET)
 * - After-hours reporters for yesterdayStr (numbers finalized overnight)
 */
async function fetchNasdaq(date: string) {
  const res = await fetch(
    `https://api.nasdaq.com/api/calendar/earnings?date=${date}`,
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Cobalt/1.0)" },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) {
    throw new Error(`Nasdaq calendar ${res.status} for ${date}`);
  }
  const json = (await res.json()) as {
    data?: { rows?: { symbol: string; time?: string }[] };
  };
  return json?.data?.rows ?? [];
}

export async function fetchEarningsReporters(
  todayStr: string,
  yesterdayStr: string
): Promise<string[]> {
  const [todayRows, yesterdayRows] = await Promise.all([
    fetchNasdaq(todayStr),
    fetchNasdaq(yesterdayStr),
  ]);

  const preMarketToday = todayRows
    .filter((r) => r.time === "time-pre-market")
    .map((r) => r.symbol.toUpperCase());

  const afterHoursYesterday = yesterdayRows
    .filter((r) => r.time === "time-after-hours")
    .map((r) => r.symbol.toUpperCase());

  return [...new Set([...preMarketToday, ...afterHoursYesterday])];
}

// ── DB queries ────────────────────────────────────────────────────────────────

/** Returns which of the given symbols exist in our fundamentals table. */
export async function intersectWithFundamentals(
  symbols: string[]
): Promise<string[]> {
  if (symbols.length === 0) {
    return [];
  }
  const rows = await db
    .select({ symbol: fundamentals.symbol })
    .from(fundamentals)
    .where(inArray(fundamentals.symbol, symbols));
  return rows.map((r) => r.symbol);
}

/**
 * Returns symbols whose analyst data is stale (older than 7 days or never synced),
 * excluding any symbols already refreshed in this run.
 */
export async function fetchStaleAnalystSymbols(
  excludeSymbols: string[],
  limit: number
): Promise<string[]> {
  const staleAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ symbol: fundamentals.symbol })
    .from(fundamentals)
    .where(
      and(
        excludeSymbols.length > 0
          ? sql`${fundamentals.symbol} NOT IN (${sql.join(
              excludeSymbols.map((s) => sql`${s}`),
              sql`, `
            )})`
          : sql`true`,
        or(
          isNotNull(fundamentals.analystSyncedAt) &&
            lt(fundamentals.analystSyncedAt, staleAfter),
          sql`${fundamentals.analystSyncedAt} IS NULL`
        )
      )
    )
    .limit(limit);
  return rows.map((r) => r.symbol);
}

// ── FMP fetches ───────────────────────────────────────────────────────────────

/**
 * Full financials refresh for a single symbol (income, balance, cash-flow, grades).
 * Throws on FMP errors so the caller's step can decide retry vs. silent failure.
 */
export async function fetchAndMapFinancials(
  symbol: string
): Promise<FundamentalsInsert> {
  const [incomeRaw, balanceRaw, cashFlowRaw, gradesRaw] = await Promise.all([
    fmpStableGet("income-statement", { limit: 1, period: "annual", symbol }),
    fmpStableGet("balance-sheet-statement", {
      limit: 1,
      period: "annual",
      symbol,
    }),
    fmpStableGet("cash-flow-statement", { limit: 1, period: "annual", symbol }),
    fmpStableGet("grades-consensus", { symbol }),
  ]);

  const income = firstRow(incomeRaw);
  const balance = firstRow(balanceRaw);
  const cashFlow = firstRow(cashFlowRaw);
  const grades = firstRow(gradesRaw);
  const now = new Date();

  return {
    ...(income ? mapIncomeFields(income, now) : {}),
    ...(balance ? mapBalanceFields(balance) : {}),
    ...(grades ? mapGradesFields(grades, now) : {}),
    capex: cashFlow ? num(cashFlow.capitalExpenditure) : null,
    operatingCashFlow: cashFlow ? num(cashFlow.operatingCashFlow) : null,
    symbol,
  };
}

/**
 * Analyst-only refresh for a single symbol (grades-consensus).
 * Throws on FMP errors so the caller's step can decide retry vs. silent failure.
 */
export async function fetchAndMapAnalysts(
  symbol: string
): Promise<Partial<FundamentalsInsert>> {
  const gradesRaw = await fmpStableGet("grades-consensus", { symbol });
  const grades = firstRow(gradesRaw);
  if (!grades) {
    throw new Error(`No grades data for ${symbol}`);
  }
  return { ...mapGradesFields(grades, new Date()), symbol };
}

// ── DB upserts ────────────────────────────────────────────────────────────────

export async function upsertFundamentalsRows(
  rows: FundamentalsInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db
    .insert(fundamentals)
    .values(rows)
    .onConflictDoUpdate({
      set: {
        analystBuy: sql`excluded.analyst_buy`,
        analystConsensus: sql`excluded.analyst_consensus`,
        analystHold: sql`excluded.analyst_hold`,
        analystSell: sql`excluded.analyst_sell`,
        analystStrongBuy: sql`excluded.analyst_strong_buy`,
        analystStrongSell: sql`excluded.analyst_strong_sell`,
        analystSyncedAt: sql`excluded.analyst_synced_at`,
        capex: sql`excluded.capex`,
        cash: sql`excluded.cash`,
        eps: sql`excluded.eps`,
        financialsSyncedAt: sql`excluded.financials_synced_at`,
        grossProfit: sql`excluded.gross_profit`,
        longTermDebt: sql`excluded.long_term_debt`,
        netIncome: sql`excluded.net_income`,
        operatingCashFlow: sql`excluded.operating_cash_flow`,
        operatingIncome: sql`excluded.operating_income`,
        revenue: sql`excluded.revenue`,
        sharesOutstandingDiluted: sql`excluded.shares_outstanding_diluted`,
        stockholdersEquity: sql`excluded.stockholders_equity`,
        totalAssets: sql`excluded.total_assets`,
        totalLiabilities: sql`excluded.total_liabilities`,
      },
      target: fundamentals.symbol,
    });
}

export async function upsertAnalystRows(
  rows: Partial<FundamentalsInsert>[]
): Promise<void> {
  const full = rows.filter((r): r is FundamentalsInsert => Boolean(r.symbol));
  if (full.length === 0) {
    return;
  }
  await db
    .insert(fundamentals)
    .values(full)
    .onConflictDoUpdate({
      set: {
        analystBuy: sql`excluded.analyst_buy`,
        analystConsensus: sql`excluded.analyst_consensus`,
        analystHold: sql`excluded.analyst_hold`,
        analystSell: sql`excluded.analyst_sell`,
        analystStrongBuy: sql`excluded.analyst_strong_buy`,
        analystStrongSell: sql`excluded.analyst_strong_sell`,
        analystSyncedAt: sql`excluded.analyst_synced_at`,
      },
      target: fundamentals.symbol,
    });
}
