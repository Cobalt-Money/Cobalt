import { db } from "@cobalt-web/db";
import { plaidSyncPayload } from "@cobalt-web/db/schema/places/plaid-sync-payload";

/**
 * Append-only audit: raw Plaid `transactions/sync` response.
 *
 * Best-effort — audit must never fail a real sync, so we swallow errors and
 * log instead of throwing. Stored in `enrichment.plaid_sync_payload`, which
 * lives outside Zero's publication and outside the plaid_connection cascade
 * chain, so the history survives disconnect/reconnect cycles.
 */
export async function recordPlaidSyncPayload(args: {
  itemId: string;
  userId: string;
  request: { cursor: string | undefined; count: number };
  // Plaid's TransactionsSyncResponse shape; we store the JSON as-received and
  // avoid a tight import-time coupling to the SDK type.
  response: unknown;
}): Promise<void> {
  try {
    await db.insert(plaidSyncPayload).values({
      itemId: args.itemId,
      request: args.request,
      response: args.response,
      userId: args.userId,
    });
  } catch (error) {
    console.warn("[recordPlaidSyncPayload] failed", {
      error: error instanceof Error ? error.message : error,
      itemId: args.itemId,
    });
  }
}
