import type { FundamentalsInsert } from "@cobalt-web/db/schema/research/fundamentals";
import { sleep } from "workflow";

import {
  CONCURRENCY,
  fetchEarningsReporters,
  fetchStaleAnalysts,
  filterTrackedSymbols,
  refreshAnalysts,
  refreshFinancials,
  upsertAnalysts,
  upsertFinancials,
} from "./steps.js";

// 8 tickers × 4 FMP calls = 32 calls/batch. 15s keeps us under 300 req/min.
const BATCH_DELAY = "15s";

export async function refreshFundamentalsWorkflow(
  todayStr: string,
  yesterdayStr: string,
): Promise<{
  analystsRefreshed: number;
  earningsReporters: number;
  financialsFailed: number;
  financialsRefreshed: number;
}> {
  "use workflow";

  // 1. Fetch earnings reporters from Nasdaq calendar
  const earningsSymbols = await fetchEarningsReporters(todayStr, yesterdayStr);

  // 2. Intersect with our DB (skip symbols we don't track)
  const earningsInDb = await filterTrackedSymbols(earningsSymbols);

  // 3. Refresh financials in batches (respect FMP 300 req/min)
  const financialsResults: (FundamentalsInsert | null)[] = [];
  for (let i = 0; i < earningsInDb.length; i += CONCURRENCY) {
    const batch = earningsInDb.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((symbol) => refreshFinancials(symbol)));
    financialsResults.push(...batchResults);
    if (i + CONCURRENCY < earningsInDb.length) {
      await sleep(BATCH_DELAY);
    }
  }

  const financialsToInsert = financialsResults.filter((r): r is FundamentalsInsert => r !== null);
  await upsertFinancials(financialsToInsert);

  // 4. Refresh stale analyst data
  const staleSymbols = await fetchStaleAnalysts(earningsInDb);

  const analystResults: (Partial<FundamentalsInsert> | null)[] = [];
  for (let i = 0; i < staleSymbols.length; i += CONCURRENCY) {
    const batch = staleSymbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((symbol) => refreshAnalysts(symbol)));
    analystResults.push(...batchResults);
    if (i + CONCURRENCY < staleSymbols.length) {
      await sleep(BATCH_DELAY);
    }
  }

  const analystsToInsert = analystResults.filter(
    (r): r is Partial<FundamentalsInsert> => r !== null,
  );
  await upsertAnalysts(analystsToInsert);

  return {
    analystsRefreshed: analystsToInsert.length,
    earningsReporters: earningsInDb.length,
    financialsFailed: financialsResults.length - financialsToInsert.length,
    financialsRefreshed: financialsToInsert.length,
  };
}
