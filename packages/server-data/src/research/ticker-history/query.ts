import { fmpStableGet } from "@cobalt-web/clients/fmp";

import type { FmpHistoricalPoint } from "../chart/query.js";
import { num, str } from "../_shared/parse.js";
import { withFmpUpstream } from "../_shared/fmp-upstream.js";

/**
 * Fetch end-of-day historical points for an arbitrary date range.
 * Used by the manual-holding cost-basis picker, which needs closes around a
 * user-supplied purchase date (not relative to today).
 */
export async function getHistoricalRange(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<FmpHistoricalPoint[]> {
  const raw = await withFmpUpstream(() =>
    fmpStableGet("historical-price-eod/full", {
      from: fromDate,
      symbol,
      to: toDate,
    }),
  );

  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as Record<string, unknown>).historical)
  ) {
    items = (raw as Record<string, unknown>).historical as unknown[];
  } else {
    return [];
  }

  const points: FmpHistoricalPoint[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const o = entry as Record<string, unknown>;
    const dateStr = str(o.date);
    if (!dateStr) {
      continue;
    }
    points.push({
      close: num(o.close) ?? 0,
      date: dateStr,
      high: num(o.high) ?? 0,
      low: num(o.low) ?? 0,
      open: num(o.open) ?? 0,
      volume: num(o.volume) ?? 0,
    });
  }

  return points.toReversed();
}
