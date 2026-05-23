import type { AccountResolution } from "@cobalt-web/db/schema/imports/import-job";
import { ensureUncategorizedCategory } from "@cobalt-web/server-data/imports/category-mapping/mutations";
import {
  applyPendingAccountCreates,
  applyPendingCreates,
  finalizeCommit,
  insertCommitChunks,
  persistResolvedAccountResolution,
  persistResolvedCategoryResolution,
} from "@cobalt-web/server-data/imports/commit/mutations";
import {
  isJobCancelled,
  loadCommitResolutions,
} from "@cobalt-web/server-data/imports/commit/queries";
import {
  markImportJobCancelled,
  markImportJobCommitting,
  markImportJobFailed,
  setProgress,
} from "@cobalt-web/server-data/imports/_shared/mutations";

export interface CommitWorkflowParams {
  jobId: string;
  userId: string;
}

export interface CommitWorkflowResult {
  jobId: string;
  success: boolean;
  imported?: number;
  duplicates?: number;
  excluded?: number;
  error?: string;
  cancelled?: boolean;
}

/** Read job + assert it has the resolutions we need before commit. */
export async function loadJobStep(params: CommitWorkflowParams) {
  "use step";

  const resolutions = await loadCommitResolutions(params.userId, params.jobId);
  await markImportJobCommitting(params.jobId);
  await setProgress(params.jobId, "loading", 0, 0);
  return resolutions;
}

export async function applyAccountCreatesStep(
  params: CommitWorkflowParams,
  loaded: Awaited<ReturnType<typeof loadJobStep>>,
) {
  "use step";

  await setProgress(params.jobId, "applying_creates", 0, 0);
  const resolved = await applyPendingAccountCreates(params.userId, loaded.accountResolution);
  // Persist resolved (no pendingCreates) so retries after crash skip the inserts.
  await persistResolvedAccountResolution(params.jobId, resolved);
  return { resolvedAccountResolution: resolved };
}

export async function applyCreatesStep(
  params: CommitWorkflowParams,
  loaded: Awaited<ReturnType<typeof loadJobStep>>,
) {
  "use step";

  await setProgress(
    params.jobId,
    "applying_creates",
    0,
    loaded.categoryResolution.pendingCreates.length,
  );
  const uncategorizedId = await ensureUncategorizedCategory(params.userId);
  const map = await applyPendingCreates(
    params.userId,
    loaded.categoryResolution.pendingCreates,
    loaded.categoryResolution.map,
    uncategorizedId,
  );
  // Persist the resolved map so re-runs (post-crash) skip create work.
  await persistResolvedCategoryResolution(params.jobId, loaded.categoryResolution, map);
  return { resolvedCategoryMap: map };
}

export async function chunkedInsertStep(
  params: CommitWorkflowParams,
  resolvedCategoryMap: Record<string, string>,
  resolvedAccountResolution: AccountResolution,
): Promise<{
  imported: number;
  duplicates: number;
  excluded: number;
  cancelled: boolean;
}> {
  "use step";

  const uncategorizedId = await ensureUncategorizedCategory(params.userId);
  await setProgress(params.jobId, "inserting", 0, 0);
  const result = await insertCommitChunks({
    accountResolution: resolvedAccountResolution,
    categoryMap: resolvedCategoryMap,
    isCancelled: () => isJobCancelled(params.jobId),
    jobId: params.jobId,
    onProgress: async (done, total) => {
      await setProgress(params.jobId, "inserting", done, total);
    },
    uncategorizedId,
    userId: params.userId,
  });
  const cancelled = await isJobCancelled(params.jobId);
  return { ...result, cancelled };
}

export async function markCommittedStep(
  params: CommitWorkflowParams,
  result: {
    imported: number;
    duplicates: number;
    excluded: number;
    cancelled: boolean;
  },
) {
  "use step";

  if (result.cancelled) {
    await markImportJobCancelled(params.jobId);
    return;
  }
  await setProgress(params.jobId, "finalizing", result.imported, result.imported);
  await finalizeCommit(params.jobId, {
    duplicates: result.duplicates,
    excluded: result.excluded,
    failed: 0,
    imported: result.imported,
    rejected: [],
  });
}

export async function failCommitStep(jobId: string, message: string): Promise<void> {
  "use step";

  await markImportJobFailed(jobId, message);
}
