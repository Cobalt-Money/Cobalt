import type { Security } from "plaid";

import { computeInvestmentTransactionsDateRange } from "./lib";
import {
  fetchHoldingsStep,
  fetchInvestmentTransactionsPageStep,
  upsertActivitiesStep,
  upsertPositionsStep,
  upsertSecuritiesStep,
} from "./steps";

/** Fetch current holdings snapshot and persist securities + positions. */
export async function syncHoldings(accessToken: string): Promise<void> {
  const fetchResult = await fetchHoldingsStep(accessToken);
  if (fetchResult.kind === "skip") {
    return;
  }
  await Promise.all([
    upsertSecuritiesStep(fetchResult.data.securities),
    upsertPositionsStep(fetchResult.data.holdings),
  ]);
}

/** Paginate investment transactions for the standard onboarding window. */
export async function syncInvestmentTransactions(accessToken: string): Promise<void> {
  const { startDate, endDate } = computeInvestmentTransactionsDateRange();

  let offset = 0;
  const seenSecurityIds = new Set<string>();

  while (true) {
    const pageResult = await fetchInvestmentTransactionsPageStep(
      accessToken,
      startDate,
      endDate,
      offset,
    );

    if (pageResult.kind === "skip") {
      return;
    }

    const { transactions, securities, totalAvailable } = pageResult.data;

    const newSecurities = securities.filter((s: Security) => !seenSecurityIds.has(s.security_id));
    if (newSecurities.length > 0) {
      await upsertSecuritiesStep(newSecurities);
      for (const s of newSecurities) {
        seenSecurityIds.add(s.security_id);
      }
    }

    if (transactions.length > 0) {
      await upsertActivitiesStep(transactions);
    }

    offset += transactions.length;
    if (transactions.length === 0 || offset >= totalAvailable) {
      return;
    }
  }
}
