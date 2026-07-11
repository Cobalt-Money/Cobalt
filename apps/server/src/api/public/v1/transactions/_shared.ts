import type { TransactionResponse } from "@cobalt-web/server-data/transactions/detail/schema";

import { transactionSchema } from "../schemas.js";

export const transactionResponseSchema = transactionSchema.openapi("TransactionDetail");

/**
 * Strip the internal `TransactionResponse` down to the public-safe shape.
 * Drops `source: "plaid" | "manual"` and locked-field metadata — SDK
 * consumers don't need them. `logoUrl` and `website` are kept so consumers
 * (Raycast, third-party clients) can render merchant logos.
 *
 * `sharedWithFriends` is computed at the route layer (single lookup for
 * detail, bulk for list) — defaults to false when not provided.
 */
export function toTransaction(tx: TransactionResponse, sharedWithFriends = false) {
  return {
    accountId: tx.accountId,
    amount: tx.amount,
    category: tx.category?.name ?? null,
    date: tx.date,
    id: tx.id,
    location: tx.location,
    logoUrl: tx.logoUrl ?? null,
    merchant: tx.merchantName ?? null,
    name: tx.name,
    notes: typeof tx.notes === "string" ? tx.notes : null,
    paymentChannel: tx.paymentChannel,
    pending: tx.pending,
    sharedWithFriends,
    tagIds: tx.tagIds,
    website: tx.website ?? null,
  };
}
