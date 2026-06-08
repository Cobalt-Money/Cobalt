import { index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { transaction } from "../accounts/banking/transactions/transaction";
import { merchant } from "./merchant";
import { merchantLocation } from "./merchant-location";

/**
 * SRI-353 — audit log for merchant enrichment writes.
 *
 * One row per successful field-write batch from `enrichTransactionsForUser`.
 * Server-internal — not exposed via any DTO. Enables: bulk rollback by
 * `runId` when a bad enrichment ships; per-txn forensic ("what did we write
 * and why"); diff-of-state when re-running the backfill.
 *
 * `fieldsWritten` shape: `{ [columnName]: { old: unknown, new: unknown } }`.
 */
export const enrichmentEvent = pgTable(
  "enrichment_event",
  {
    /** Brand the matcher selected; null on skip events. */
    brandId: uuid("brand_id").references(() => merchant.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** `{ col: { old, new } }` for every column the run touched. */
    fieldsWritten: jsonb("fields_written").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Specific `merchant_location` row when match included a location anchor. */
    locationId: uuid("location_id").references(() => merchantLocation.id, {
      onDelete: "set null",
    }),
    /** Branch the matcher took (e.g. `geo`, `address`, `city_region`, `skip`). */
    matchReason: text("match_reason").notNull(),
    /** Batch identifier — all writes from one enrichment invocation share a runId. */
    runId: uuid("run_id").notNull(),
    /** Trigram similarity of the brand match (0..1). */
    sim: numeric("sim", { precision: 5, scale: 4 }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("enrichment_event_transaction_id_idx").on(t.transactionId),
    index("enrichment_event_run_id_idx").on(t.runId),
    index("enrichment_event_created_at_idx").on(t.createdAt),
  ],
);

export type EnrichmentEvent = typeof enrichmentEvent.$inferSelect;
export type EnrichmentEventInsert = typeof enrichmentEvent.$inferInsert;
