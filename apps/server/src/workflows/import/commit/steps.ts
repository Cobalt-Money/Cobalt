import {
  commitStagedTransactions,
  markImportJobFailed,
  resolveAccountMap,
} from "@cobalt-web/server-data/import/mutations";

export interface CommitWorkflowParams {
  jobId: string;
  userId: string;
}

export interface CommitWorkflowResult {
  committedCount?: number;
  error?: string;
  jobId: string;
  skippedCount?: number;
  success: boolean;
}

/**
 * Insert non-duplicate, non-skipped staged rows into `transaction` and mark the job
 * `committed`. Re-resolves the account map so manual-account creation is the
 * single source of truth (idempotent for re-runs since the resolver is keyed by
 * mapping entries, not by random side effects).
 */
export async function commitImportJobStep(
  params: CommitWorkflowParams,
): Promise<{ committed: number; skipped: number }> {
  "use step";

  const resolved = await resolveAccountMap(params.userId, params.jobId);
  return commitStagedTransactions(params.userId, params.jobId, resolved);
}

export async function failCommitStep(jobId: string, message: string): Promise<void> {
  "use step";

  await markImportJobFailed(jobId, message);
}
