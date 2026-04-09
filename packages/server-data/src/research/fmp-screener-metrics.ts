import { fmpStableGet } from "@cobalt-web/clients/fmp";

/** Parallel symbol batches (income + grades-consensus + ratios = 3 HTTP calls per symbol per batch). */
const METRICS_CONCURRENCY = 6;

function rowSymbolUpper(row: Record<string, unknown>): string {
  const s = row.symbol ?? row.ticker;
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

function parseLatestAnnualRevenue(raw: unknown): number | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const [first] = raw;
  if (!first || typeof first !== "object") {
    return undefined;
  }
  const rev = (first as Record<string, unknown>).revenue;
  if (typeof rev === "number" && Number.isFinite(rev)) {
    return rev;
  }
  return undefined;
}

function parseIntField(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export interface GradesConsensusCounts {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
}

/** FMP `grades-consensus` — headline `consensus` plus five sentiment buckets. */
function parseGradesConsensus(raw: unknown): {
  consensus?: string;
  counts?: GradesConsensusCounts;
} {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {};
  }
  const [first] = raw;
  if (!first || typeof first !== "object") {
    return {};
  }
  const o = first as Record<string, unknown>;
  const consensus =
    typeof o.consensus === "string" && o.consensus.trim()
      ? o.consensus.trim()
      : undefined;
  const counts: GradesConsensusCounts = {
    buy: parseIntField(o.buy),
    hold: parseIntField(o.hold),
    sell: parseIntField(o.sell),
    strongBuy: parseIntField(o.strongBuy),
    strongSell: parseIntField(o.strongSell),
  };
  return {
    consensus,
    counts,
  };
}

function parsePeRatio(raw: unknown): number | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const [first] = raw;
  if (!first || typeof first !== "object") {
    return undefined;
  }
  const pe = (first as Record<string, unknown>).priceToEarningsRatio;
  if (typeof pe === "number" && Number.isFinite(pe)) {
    return pe;
  }
  if (typeof pe === "string") {
    const n = Number.parseFloat(pe);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

async function fetchRevenueAndGradesConsensusForSymbol(sym: string): Promise<{
  gradesConsensus?: string;
  gradesConsensusCounts?: GradesConsensusCounts;
  peRatio?: number;
  revenue?: number;
}> {
  try {
    const [incomeRaw, gradesRaw, ratiosRaw] = await Promise.all([
      fmpStableGet("income-statement", {
        limit: 1,
        period: "annual",
        symbol: sym,
      }),
      fmpStableGet("grades-consensus", { symbol: sym }),
      fmpStableGet("ratios", { limit: 1, symbol: sym }),
    ]);
    const g = parseGradesConsensus(gradesRaw);
    return {
      gradesConsensus: g.consensus,
      gradesConsensusCounts: g.counts,
      peRatio: parsePeRatio(ratiosRaw),
      revenue: parseLatestAnnualRevenue(incomeRaw),
    };
  } catch {
    return {};
  }
}

/**
 * Adds latest **annual revenue** (`income-statement`, `period=annual`, `limit=1`),
 * **analyst consensus** (`grades-consensus`), and **P/E** (`ratios` latest row → `priceToEarningsRatio`).
 * One batched wave per symbol (3 FMP calls each); not bulk — bulk endpoints are often paywalled.
 */
export async function enrichScreenerRowsWithRevenueAndRating(
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const symbols = [...new Set(rows.map(rowSymbolUpper).filter(Boolean))];
  if (symbols.length === 0) {
    return rows;
  }

  const metricsBySym = new Map<
    string,
    {
      gradesConsensus?: string;
      gradesConsensusCounts?: GradesConsensusCounts;
      peRatio?: number;
      revenue?: number;
    }
  >();

  for (let i = 0; i < symbols.length; i += METRICS_CONCURRENCY) {
    const chunk = symbols.slice(i, i + METRICS_CONCURRENCY);
    const settled = await Promise.all(
      chunk.map(async (sym) => {
        const m = await fetchRevenueAndGradesConsensusForSymbol(sym);
        return [sym, m] as const;
      })
    );
    for (const [sym, m] of settled) {
      metricsBySym.set(sym, m);
    }
  }

  return rows.map((row) => {
    const sym = rowSymbolUpper(row);
    const m = sym ? metricsBySym.get(sym) : undefined;
    return {
      ...row,
      gradesConsensus: m?.gradesConsensus,
      gradesConsensusCounts: m?.gradesConsensusCounts,
      peRatio: m?.peRatio,
      revenue: m?.revenue,
    };
  });
}
