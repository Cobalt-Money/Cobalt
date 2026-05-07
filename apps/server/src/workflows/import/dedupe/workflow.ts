import { failJobStep, resolveAccountMapStep, runDedupePassStep } from "./steps";
import type { DedupeWorkflowParams, DedupeWorkflowResult } from "./steps";

/**
 * SRI-317 dedupe workflow.
 *
 * Triggered after the user submits the account mapping. Two stages, durable across crashes:
 *   1. Resolve mapping entries (creating manual accounts for `kind: "create"`).
 *   2. Run the dedupe pass against existing transactions in each mapped account's date window.
 *
 * On success leaves the job in `mapped`; commit is gated behind a separate user action.
 */
export async function importDedupeWorkflow(
  params: DedupeWorkflowParams,
): Promise<DedupeWorkflowResult> {
  "use workflow";

  try {
    const resolved = await resolveAccountMapStep(params);
    const counts = await runDedupePassStep(params, resolved);

    return {
      jobId: params.jobId,
      matchedCount: counts.matched,
      scannedCount: counts.scanned,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await failJobStep(params.jobId, message);
    return {
      error: message,
      jobId: params.jobId,
      success: false,
    };
  }
}
