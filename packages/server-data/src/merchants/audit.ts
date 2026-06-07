import { db } from "@cobalt-web/db";
import { enrichmentEvent } from "@cobalt-web/db/schema/merchants/enrichment-event";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type EnrichmentMatchReason =
  | "store_number"
  | "geo"
  | "address"
  | "city_region"
  | "brand_only";

export interface EnrichmentLogInput {
  transactionId: string;
  runId: string;
  matchReason: EnrichmentMatchReason;
  brandId: string | null;
  locationId: string | null;
  /** `{ col: { old, new } }` — every column the run touched. */
  fieldsWritten: Record<string, { old: unknown; new: unknown }>;
  sim: number | null;
}

/**
 * Append one row to `enrichment_event`. Server-internal — used by
 * `enrich.ts` after every successful write so a future regression can be
 * rolled back by `runId` and individual txns can be forensically traced.
 *
 * Pass `tx` to run inside an existing transaction (recommended — pairs the
 * audit insert atomically with the `transaction` UPDATE).
 */
export async function logEnrichmentEvent(input: EnrichmentLogInput, tx?: DbOrTx): Promise<void> {
  const conn = tx ?? db;
  await conn.insert(enrichmentEvent).values({
    brandId: input.brandId,
    fieldsWritten: input.fieldsWritten,
    locationId: input.locationId,
    matchReason: input.matchReason,
    runId: input.runId,
    sim: input.sim === null ? null : String(input.sim),
    transactionId: input.transactionId,
  });
}
