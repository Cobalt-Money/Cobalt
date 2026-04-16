import { db } from "@cobalt-web/db";
import { fundamentals } from "@cobalt-web/db/schema/research/fundamentals";
import { inArray } from "drizzle-orm";

export interface GradesConsensusCounts {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
}

function rowSymbolUpper(row: Record<string, unknown>): string {
  const s = row.symbol ?? row.ticker;
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

/**
 * Enriches screener rows with revenue, analyst consensus, and P/E ratio
 * by reading from the pre-fetched `fundamentals` table — no FMP calls per symbol.
 */
export async function enrichScreenerRowsWithRevenueAndRating(
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const symbols = [...new Set(rows.map(rowSymbolUpper).filter(Boolean))];
  if (symbols.length === 0) {
    return rows;
  }

  const fundRows = await db
    .select({
      analystBuy: fundamentals.analystBuy,
      analystConsensus: fundamentals.analystConsensus,
      analystHold: fundamentals.analystHold,
      analystSell: fundamentals.analystSell,
      analystStrongBuy: fundamentals.analystStrongBuy,
      analystStrongSell: fundamentals.analystStrongSell,
      eps: fundamentals.eps,
      revenue: fundamentals.revenue,
      symbol: fundamentals.symbol,
    })
    .from(fundamentals)
    .where(inArray(fundamentals.symbol, symbols));

  const bySymbol = new Map(fundRows.map((r) => [r.symbol, r]));

  return rows.map((row) => {
    const sym = rowSymbolUpper(row);
    const f = sym ? bySymbol.get(sym) : undefined;
    if (!f) {
      return {
        ...row,
        gradesConsensus: undefined,
        gradesConsensusCounts: undefined,
        peRatio: undefined,
        revenue: undefined,
      };
    }

    const counts: GradesConsensusCounts = {
      buy: f.analystBuy ?? 0,
      hold: f.analystHold ?? 0,
      sell: f.analystSell ?? 0,
      strongBuy: f.analystStrongBuy ?? 0,
      strongSell: f.analystStrongSell ?? 0,
    };

    // P/E = price / EPS. Price comes from the FMP screener row.
    const price =
      typeof row.price === "number" && Number.isFinite(row.price)
        ? row.price
        : null;
    const eps = f.eps === null ? null : Number.parseFloat(String(f.eps));
    const peRatio =
      price !== null && eps !== null && eps !== 0 ? price / eps : undefined;

    return {
      ...row,
      gradesConsensus: f.analystConsensus ?? undefined,
      gradesConsensusCounts: counts,
      peRatio,
      revenue: f.revenue === null ? undefined : Number(f.revenue),
    };
  });
}
