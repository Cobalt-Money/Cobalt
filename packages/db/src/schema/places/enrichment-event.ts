import { index, jsonb, numeric, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { enrichmentSchema } from "./_schema";
import { place } from "./place";

/**
 * SRI-354 — audit log for place-enrichment writes.
 *
 * One row per successful enrichment write batch. Enables bulk rollback by
 * `runId` and per-txn forensics ("what did we write, why, against which place").
 * Server-internal — never exposed via DTO.
 *
 * `fieldsWritten` shape: `{ [columnName]: { old: unknown, new: unknown } }`.
 */
export const enrichmentEvent = enrichmentSchema.table(
  "enrichment_event",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** `{ col: { old, new } }` for every column the run touched. */
    fieldsWritten: jsonb("fields_written").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Final match confidence 0..1 — same value mirrored to transaction.place_match_confidence. */
    matchConfidence: numeric("match_confidence", {
      precision: 5,
      scale: 4,
    }).notNull(),
    /** Branch the matcher took: `store_number` | `geo` | `postal` | `address` | `city_region`. */
    matchReason: text("match_reason").notNull(),
    /** Place the matcher selected; null on skip events. */
    placeId: uuid("place_id").references(() => place.id, {
      onDelete: "set null",
    }),
    /** Batch identifier — all writes from one enrichment invocation share a runId. */
    runId: uuid("run_id").notNull(),
    /** Trigram brand-name similarity at match time (0..1). Stored separately from confidence for tuning. */
    sim: numeric("sim", { precision: 5, scale: 4 }),
    // Plain uuid, no FK + no cascade. Audit log outlives the live transaction
    // row — when a Plaid item is disconnected, transactions are deleted but
    // we keep the matcher's decision history so non-determinism across item
    // lifecycles (same merchant, different runs) stays debuggable.
    transactionId: uuid("transaction_id").notNull(),
  },
  (t) => [
    index("enrichment_event_transaction_id_idx").on(t.transactionId),
    index("enrichment_event_run_id_idx").on(t.runId),
    index("enrichment_event_created_at_idx").on(t.createdAt),
    index("enrichment_event_place_id_idx").on(t.placeId),
  ],
);

export type EnrichmentEvent = typeof enrichmentEvent.$inferSelect;
export type EnrichmentEventInsert = typeof enrichmentEvent.$inferInsert;
