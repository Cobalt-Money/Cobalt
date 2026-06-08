import type { TransactionResponse } from "@cobalt-web/server-data/transactions/detail/schema";

import { transactionSchema } from "../schemas.js";

export const transactionResponseSchema = transactionSchema.openapi("TransactionDetail");

/**
 * Strip the internal `TransactionResponse` down to the public-safe shape.
 * Drops `source: "plaid" | "manual"`, locked-field metadata, logos, and the
 * merchant URL — internal-leaning fields SDK consumers don't need.
 */
export function toTransaction(tx: TransactionResponse) {
  return {
    accountId: tx.accountId,
    amount: tx.amount,
    category: tx.category?.name ?? null,
    date: tx.date,
    id: tx.id,
    location: tx.location,
    merchant: tx.merchantName ?? null,
    name: tx.name,
    notes: typeof tx.notes === "string" ? tx.notes : null,
    paymentChannel: tx.paymentChannel,
    pending: tx.pending,
    tagIds: tx.tagIds,
  };
}
