import { plaidClient } from "@cobalt-web/clients/plaid";
import type { RemovedTransaction, Transaction, TransactionStream } from "plaid";

import { recordPlaidSyncPayload } from "./audit.js";

/**
 * Fetch one page of transactions from Plaid's `/transactions/sync` endpoint.
 *
 * When `audit` is provided, the raw response is persisted (best-effort) to
 * `enrichment.plaid_sync_payload` for cross-sync diffing. Pass null to skip
 * (useful in tests and for one-off backfill scripts).
 */
export async function syncTransactionsPage(
  accessToken: string,
  cursor: string | undefined,
  count: number,
  audit: { itemId: string; userId: string } | null = null,
): Promise<{
  added: Transaction[];
  modified: Transaction[];
  removed: RemovedTransaction[];
  nextCursor: string;
  hasMore: boolean;
}> {
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    count,
    cursor,
    options: { include_personal_finance_category: true },
  });
  if (audit) {
    // Fire-and-forget — audit is best-effort and `recordPlaidSyncPayload`
    // already swallows its own errors internally, so no unhandled rejection
    // risk. Avoiding `await` keeps the audit insert off the sync hot path.
    void recordPlaidSyncPayload({
      itemId: audit.itemId,
      request: { count, cursor },
      response: response.data,
      userId: audit.userId,
    });
  }
  return {
    added: response.data.added,
    hasMore: response.data.has_more,
    modified: response.data.modified,
    nextCursor: response.data.next_cursor,
    removed: response.data.removed,
  };
}

/** Fetch recurring inflow/outflow streams from Plaid. */
export async function fetchRecurringStreams(accessToken: string): Promise<{
  inflowStreams: TransactionStream[];
  outflowStreams: TransactionStream[];
  updatedDatetime: string | null;
}> {
  const response = await plaidClient.transactionsRecurringGet({
    access_token: accessToken,
  });
  return {
    inflowStreams: response.data.inflow_streams ?? [],
    outflowStreams: response.data.outflow_streams ?? [],
    updatedDatetime: response.data.updated_datetime ?? null,
  };
}
