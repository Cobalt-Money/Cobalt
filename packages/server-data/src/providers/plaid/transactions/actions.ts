import { plaidClient } from "@cobalt-web/clients/plaid";
import type { RemovedTransaction, Transaction, TransactionStream } from "plaid";

/** Fetch one page of transactions from Plaid's `/transactions/sync` endpoint. */
export async function syncTransactionsPage(
  accessToken: string,
  cursor: string | undefined,
  count: number,
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
