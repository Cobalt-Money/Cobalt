import { enrichTransactionsStep } from "../sync/steps";

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
 * Idempotent: enrichTransactionsForPlaidItem skips locked/already-filled
 * fields, so re-runs are safe.
 */
export async function enrichTransactionsWorkflow(
  itemId: string,
): Promise<EnrichTransactionsResult> {
  "use workflow";

  try {
    const result = await enrichTransactionsStep(itemId);
    return {
      enriched: result.enriched,
      itemId,
      runId: result.runId,
      scanned: result.scanned,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: errorMessage, itemId, success: false };
  }
}
