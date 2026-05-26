import type { TransactionResponse } from "@cobalt-web/server-data/transactions/detail/schema";

import { transactionSchema } from "../schemas.js";

export const transactionResponseSchema = transactionSchema.openapi("TransactionDetail");

/**
 * Strip the internal `TransactionResponse` down to the public-safe shape.
 * Notably drops `source: "plaid" | "manual"`, location data, locked-field
 * metadata, logos, and the merchant URL — all internal-leaning fields that
 * SDK consumers don't need and we don't want to commit to as contract.
 */
export function toTransaction(tx: TransactionResponse) {
  return {
    accountId: tx.accountId,
    amount: tx.amount,
    category: tx.category?.name ?? null,
    date: tx.date,
    id: tx.id,
    merchant: tx.merchantName ?? null,
    name: tx.name,
    notes: typeof tx.notes === "string" ? tx.notes : null,
    pending: tx.pending,
    tagIds: tx.tagIds,
  };
}
