import { db } from "@cobalt-web/db";
import { enrichmentEvent } from "@cobalt-web/db/schema/merchants/enrichment-event";

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
 * Best-effort: a logging failure must not abort the enrichment write that
 * just landed, so callers can decide whether to swallow errors.
 */
export async function logEnrichmentEvent(input: EnrichmentLogInput): Promise<void> {
  await db.insert(enrichmentEvent).values({
    brandId: input.brandId,
    fieldsWritten: input.fieldsWritten,
    locationId: input.locationId,
    matchReason: input.matchReason,
    runId: input.runId,
    sim: input.sim === null ? null : String(input.sim),
    transactionId: input.transactionId,
  });
}
