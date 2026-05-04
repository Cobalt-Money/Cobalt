import { fmpStableGet } from "@cobalt-web/clients/fmp";

const BATCH_QUOTE_CHUNK = 50;
/** Parallel `stock-price-change` calls per batch (avoid rate limits). */
const PRICE_CHANGE_CONCURRENCY = 12;

function parseNumeric(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === "string") {
    const n = Number.parseFloat(val);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Map symbol → same-session / 1D % from batch quote (`changePercentage`). */
function parseBatchQuoteTo1dMap(raw: unknown): Map<string, number | undefined> {
  const map = new Map<string, number | undefined>();
  if (!Array.isArray(raw)) {
    return map;
  }
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const sym = typeof o.symbol === "string" ? o.symbol.trim().toUpperCase() : "";
    if (!sym) {
      continue;
    }
    const pct = parseNumeric(o.changePercentage ?? o.changesPercentage ?? o.changePercent);
    map.set(sym, pct);
  }
  return map;
}

function unwrapObject(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  if (Array.isArray(raw)) {
    const [first] = raw;
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return undefined;
  }
  return raw as Record<string, unknown>;
}

function pickNumeric(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (Object.hasOwn(o, k)) {
      const n = parseNumeric(o[k]);
      if (n !== undefined) {
        return n;
      }
    }
  }
  return undefined;
}

/**
 * FMP stable `stock-price-change` returns a flat object:
 * `1D`, `ytd`, `1Y`, etc. (see https://site.financialmodelingprep.com/developer/docs/stable/quote-change)
 * Older responses may nest under `changes`.
 */
function parseStockPriceChange(raw: unknown): {
  d1?: number;
  ytd?: number;
  y1?: number;
} {
  const o = unwrapObject(raw);
  if (!o) {
    return {};
  }

  const nested = unwrapObject(o.changes);

  const d1 =
    pickNumeric(o, ["1D", "1d"]) ?? (nested ? pickNumeric(nested, ["1D", "1d"]) : undefined);

  const ytd =
    pickNumeric(o, ["ytd", "YTD"]) ?? (nested ? pickNumeric(nested, ["ytd", "YTD"]) : undefined);

  const y1 =
    pickNumeric(o, ["1Y", "1y"]) ??
    (nested ? pickNumeric(nested, ["1Y", "1y", "year"]) : undefined);

  return { d1, y1, ytd };
}

function rowSymbolUpper(row: Record<string, unknown>): string {
  const s = row.symbol ?? row.ticker;
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

/**
 * Adds `pctChange1d`, `pctChangeYtd`, and `pctChange1y` to each row
 * (batch quote + stock-price-change).
 */
export async function enrichScreenerRowsWithReturns(
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const symbols = [...new Set(rows.map(rowSymbolUpper).filter(Boolean))];
  if (symbols.length === 0) {
    return rows;
  }

  const change1dBySym = new Map<string, number | undefined>();
  for (let i = 0; i < symbols.length; i += BATCH_QUOTE_CHUNK) {
    const chunk = symbols.slice(i, i + BATCH_QUOTE_CHUNK);
    try {
      const raw = await fmpStableGet("batch-quote", {
        symbols: chunk.join(","),
      });
      const parsed = parseBatchQuoteTo1dMap(raw);
      for (const sym of chunk) {
        change1dBySym.set(sym, parsed.get(sym));
      }
    } catch {
      for (const sym of chunk) {
        change1dBySym.set(sym, undefined);
      }
    }
  }

  const priceChangeBySym = new Map<string, { d1?: number; ytd?: number; y1?: number }>();
  for (let i = 0; i < symbols.length; i += PRICE_CHANGE_CONCURRENCY) {
    const chunk = symbols.slice(i, i + PRICE_CHANGE_CONCURRENCY);
    const settled = await Promise.all(
      chunk.map(async (sym) => {
        try {
          const raw = await fmpStableGet("stock-price-change", {
            symbol: sym,
          });
          return [sym, parseStockPriceChange(raw)] as const;
        } catch {
          return [sym, {}] as const;
        }
      }),
    );
    for (const [sym, parsed] of settled) {
      priceChangeBySym.set(sym, parsed);
    }
  }

  return rows.map((row) => {
    const sym = rowSymbolUpper(row);
    const fromQuote = sym ? change1dBySym.get(sym) : undefined;
    const pc = sym ? priceChangeBySym.get(sym) : undefined;
    const pctChange1d = fromQuote ?? pc?.d1;

    return {
      ...row,
      pctChange1d,
      pctChange1y: pc?.y1,
      pctChangeYtd: pc?.ytd,
    };
  });
}
