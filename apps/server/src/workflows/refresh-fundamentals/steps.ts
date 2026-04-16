import type { FundamentalsInsert } from "@cobalt-web/db/schema/research/fundamentals";
import {
  fetchAndMapAnalysts,
  fetchAndMapFinancials,
  fetchEarningsReporters as getEarningsReporters,
  fetchStaleAnalystSymbols as getStaleAnalysts,
  intersectWithFundamentals as filterTracked,
  upsertAnalystRows,
  upsertFundamentalsRows,
} from "@cobalt-web/server-data/research/fundamentals-refresh";
import { RetryableError } from "workflow";

export const CONCURRENCY = 8;
export const ANALYST_BATCH_SIZE = 40;

export async function fetchEarningsReporters(
  todayStr: string,
  yesterdayStr: string
): Promise<string[]> {
  "use step";
  return await getEarningsReporters(todayStr, yesterdayStr);
}

export async function filterTrackedSymbols(
  symbols: string[]
): Promise<string[]> {
  "use step";
  return await filterTracked(symbols);
}

export async function refreshFinancials(
  symbol: string
): Promise<FundamentalsInsert | null> {
  "use step";
  try {
    return await fetchAndMapFinancials(symbol);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429")) {
      throw new RetryableError(`FMP rate limited refreshing ${symbol}`, {
        retryAfter: "1m",
      });
    }
    // Non-retryable FMP errors (404, no data) → return null so the workflow continues
    return null;
  }
}

export async function upsertFinancials(
  rows: FundamentalsInsert[]
): Promise<void> {
  "use step";
  await upsertFundamentalsRows(rows);
}

export async function fetchStaleAnalysts(
  excludeSymbols: string[]
): Promise<string[]> {
  "use step";
  return await getStaleAnalysts(excludeSymbols, ANALYST_BATCH_SIZE);
}

export async function refreshAnalysts(
  symbol: string
): Promise<Partial<FundamentalsInsert> | null> {
  "use step";
  try {
    return await fetchAndMapAnalysts(symbol);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429")) {
      throw new RetryableError(
        `FMP rate limited refreshing analysts ${symbol}`,
        {
          retryAfter: "1m",
        }
      );
    }
    return null;
  }
}

export async function upsertAnalysts(
  rows: Partial<FundamentalsInsert>[]
): Promise<void> {
  "use step";
  await upsertAnalystRows(rows);
}
