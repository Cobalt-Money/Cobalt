import { db } from "@cobalt-web/db";
import { enrichmentEvent } from "@cobalt-web/db/schema/places/enrichment-event";

import type { MatchReason } from "./find.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

export interface EnrichmentLogInput {
  transactionId: string;
  runId: string;
  matchReason: MatchReason;
  /** 0..1 — mirrored to transaction.place_match_confidence. Required. */
  matchConfidence: number;
  placeId: string | null;
  /** `{ col: { old, new } }` — every column the run touched. */
  fieldsWritten: Record<string, { old: unknown; new: unknown }>;
  /** Trgm brand-name similarity at match time (0..1). Stored for tuning. */
  sim: number | null;
}

/**
 * Append one row to `enrichment_event`. Pass `tx` to pair the audit insert
 * atomically with the `transaction` UPDATE — bulk rollback by `runId` only
 * works if every UPDATE has a matching audit row.
 */
export async function logEnrichmentEvent(input: EnrichmentLogInput, tx?: DbOrTx): Promise<void> {
  const conn = tx ?? db;
  await conn.insert(enrichmentEvent).values({
    fieldsWritten: input.fieldsWritten,
    matchConfidence: String(input.matchConfidence),
    matchReason: input.matchReason,
    placeId: input.placeId,
    runId: input.runId,
    sim: input.sim === null ? null : String(input.sim),
    transactionId: input.transactionId,
  });
}
