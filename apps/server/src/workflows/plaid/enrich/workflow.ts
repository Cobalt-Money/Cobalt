import { autoShareInStoreTxnsStep, enrichTransactionsStep } from "../sync/steps";

export interface EnrichTransactionsResult {
  success: boolean;
  itemId: string;
  enriched?: number;
  scanned?: number;
  runId?: string;
  error?: string;
}

/**
 * Off-critical-path child workflow: runs `enrichTransactionsStep` after the
 * parent onboarding/sync workflow has already returned. Keeps perceived
 * onboarding latency low — Plaid txns are usable immediately; `place_id` +
 * `place_match_confidence` fill in over the next ~10-30s via Zero push.
 *
 * **Chunked**: `enrichTransactionsStep` processes at most `BATCH_LIMIT`
 * candidates per invocation and returns a `remaining` count of candidates
 * still un-enriched. The workflow loops the step until `remaining === 0`.
 * Each step finishes well inside Vercel's 800s function ceiling instead of
 * the prior single-shot model that timed out on large initial syncs.
 * The candidates query is `WHERE place_id IS NULL`, so each step naturally
 * picks up where the prior one stopped without explicit pagination.
 *
 * Idempotent: enrichTransactionsForPlaidItem skips locked/already-filled
 * fields, so re-runs are safe.
 */
const BATCH_LIMIT = 25;
// Safety cap so a runaway loop can't endlessly drive workflow runs. At
// BATCH_LIMIT=25 this allows up to 2500 candidates per workflow run, which
// is well beyond any single user's expected un-enriched in-store FOOD txns.
const MAX_BATCHES = 100;

export async function enrichTransactionsWorkflow(
  itemId: string,
): Promise<EnrichTransactionsResult> {
  "use workflow";

  try {
    let totalEnriched = 0;
    let totalScanned = 0;
    let lastRunId: string | undefined;

    for (let i = 0; i < MAX_BATCHES; i += 1) {
      const result = await enrichTransactionsStep(itemId, BATCH_LIMIT);
      totalEnriched += result.enriched;
      totalScanned += result.scanned;
      lastRunId = result.runId;
      if (result.remaining === 0) {
        break;
      }
    }

    // Isolated: auto-share is best-effort. A failure here must not roll back
    // a successful enrichment.
    try {
      await autoShareInStoreTxnsStep(itemId);
    } catch (shareError) {
      console.error(`[enrichTransactionsWorkflow] autoShareInStoreTxnsStep failed`, {
        error: shareError instanceof Error ? shareError.message : shareError,
        itemId,
      });
    }
    return {
      enriched: totalEnriched,
      itemId,
      runId: lastRunId,
      scanned: totalScanned,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: errorMessage, itemId, success: false };
  }
}
