import { db } from "@cobalt-web/db";

function rowSymbolUpper(row: Record<string, unknown>): string {
  const s = row.symbol ?? row.ticker;
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

/**
 * Enriches screener rows with revenue and P/E from the `fundamentals` table
 * (single batched query — no per-symbol FMP calls).
 */
export async function enrichScreenerRowsWithRevenueAndRating(
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const symbols = [...new Set(rows.map(rowSymbolUpper).filter(Boolean))];
  if (symbols.length === 0) {
    return rows;
  }

  const fundRows = await db.query.fundamentals.findMany({
    columns: { eps: true, revenue: true, symbol: true },
    where: { symbol: { in: symbols } },
  });

  const bySymbol = new Map(fundRows.map((r) => [r.symbol, r]));

  return rows.map((row) => {
    const sym = rowSymbolUpper(row);
    const f = sym ? bySymbol.get(sym) : undefined;
    if (!f) {
      return {
        ...row,
        peRatio: undefined,
        revenue: undefined,
      };
    }

    const price =
      typeof row.price === "number" && Number.isFinite(row.price)
        ? row.price
        : null;
    const eps = f.eps === null ? null : Number.parseFloat(String(f.eps));
    const peRatio =
      price !== null && eps !== null && eps !== 0 ? price / eps : undefined;

    return {
      ...row,
      peRatio,
      revenue: f.revenue === null ? undefined : Number(f.revenue),
    };
  });
}
