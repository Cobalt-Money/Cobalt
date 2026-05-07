import { commitImportJobStep, failCommitStep } from "./steps";
import type { CommitWorkflowParams, CommitWorkflowResult } from "./steps";

/**
 * SRI-317 commit workflow.
 *
 * Triggered when the user confirms the preview screen. Inserts non-duplicate
 * staged rows into `transaction` and finalizes the job. On failure, marks the
 * job `failed` and surfaces the error to the UI via `errorMessage`.
 */
export async function importCommitWorkflow(
  params: CommitWorkflowParams,
): Promise<CommitWorkflowResult> {
  "use workflow";

  try {
    const result = await commitImportJobStep(params);
    return {
      committedCount: result.committed,
      jobId: params.jobId,
      skippedCount: result.skipped,
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
