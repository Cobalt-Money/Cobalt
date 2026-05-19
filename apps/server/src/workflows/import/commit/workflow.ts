import {
  applyAccountCreatesStep,
  applyCreatesStep,
  chunkedInsertStep,
  failCommitStep,
  loadJobStep,
  markCommittedStep,
} from "./steps";
import type { CommitWorkflowParams, CommitWorkflowResult } from "./steps";

/**
 * SRI-321 commit workflow.
 *
 * Five durable steps. Each `step()` is a checkpoint — a crash mid-insert
 * resumes from the last completed chunk because the per-chunk progress is
 * persisted, and `(userId, importHash)` UNIQUE makes re-insert idempotent.
 *
 *   loadJob → applyAccountCreates → applyCreates → chunkedInsert → markCommitted
 */
export async function importCommitWorkflow(
  params: CommitWorkflowParams,
): Promise<CommitWorkflowResult> {
  "use workflow";

  try {
    const loaded = await loadJobStep(params);
    const { resolvedAccountResolution } = await applyAccountCreatesStep(params, loaded);
    const { resolvedCategoryMap } = await applyCreatesStep(params, loaded);
    const result = await chunkedInsertStep(params, resolvedCategoryMap, resolvedAccountResolution);
    await markCommittedStep(params, result);
    return {
      cancelled: result.cancelled,
      duplicates: result.duplicates,
      excluded: result.excluded,
      imported: result.imported,
      jobId: params.jobId,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await failCommitStep(params.jobId, message);
    return {
      error: message,
      jobId: params.jobId,
      success: false,
    };
  }
}
