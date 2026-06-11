import { index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { enrichmentSchema } from "./_schema";

/**
 * Raw `transactions/sync` response audit log. One row per Plaid sync API call.
 *
 * Purpose: determinism debugging. When the same Plaid item gets resynced (or
 * a fresh item gets created on reconnect for the same account), we want to
 * compare what Plaid sent across calls — is the data quality drifting on
 * their side, or are we corrupting it on ours? Storing the raw response
 * untouched lets us answer that with a SQL diff instead of guessing.
 *
 * Plain text `item_id` + `user_id` (no FK) so the audit history survives
 * `plaid_connection` deletion on disconnect — the whole point is to see what
 * happened across the disconnect/reconnect boundary.
 *
 * Server-internal: lives in `enrichment` schema, never exposed via Zero (the
 * Zero publication only ships `public` schema tables).
 */
export const plaidSyncPayload = enrichmentSchema.table(
  "plaid_sync_payload",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Plaid `item_id` — survives item lifecycle changes. */
    itemId: text("item_id").notNull(),
    /** Cursor / count we sent on the request (light pre-call context). */
    request: jsonb("request"),
    /** Raw `transactions/sync` response from Plaid — `added`, `modified`, `removed`, `next_cursor`, `has_more`. */
    response: jsonb("response").notNull(),
    /** Owner of the item at the time of the sync. Plain text — no FK. */
    userId: text("user_id").notNull(),
  },
  (t) => [
    index("plaid_sync_payload_item_id_created_at_idx").on(t.itemId, t.createdAt),
    index("plaid_sync_payload_user_id_created_at_idx").on(t.userId, t.createdAt),
  ],
);

export type PlaidSyncPayload = typeof plaidSyncPayload.$inferSelect;
export type PlaidSyncPayloadInsert = typeof plaidSyncPayload.$inferInsert;
