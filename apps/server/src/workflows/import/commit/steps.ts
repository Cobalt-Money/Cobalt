import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { ensureUncategorizedCategory } from "@cobalt-web/server-data/import/category-mapping/mutations";
import {
  applyPendingCreates,
  applyPendingRenames,
  finalizeCommit,
  insertCommitChunks,
} from "@cobalt-web/server-data/import/commit/mutations";
import { isJobCancelled } from "@cobalt-web/server-data/import/commit/queries";
import {
  markImportJobCancelled,
  markImportJobFailed,
  setProgress,
} from "@cobalt-web/server-data/import/shared/mutations";
import { eq } from "drizzle-orm";

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

  const job = await db.query.importJob.findFirst({
    where: { id: { eq: params.jobId } },
  });
  if (!job || job.userId !== params.userId) {
    throw new Error("Import job not found");
  }
  if (!job.accountResolution) {
    throw new Error("Account mapping not confirmed");
  }
  if (!job.categoryResolution) {
    throw new Error("Category mapping not confirmed");
  }
  await setProgress(params.jobId, "loading", 0, 0);
  return {
    accountResolution: job.accountResolution,
    categoryResolution: job.categoryResolution,
  };
}

export async function applyRenamesStep(
  params: CommitWorkflowParams,
  loaded: Awaited<ReturnType<typeof loadJobStep>>,
) {
  "use step";

  await setProgress(
    params.jobId,
    "applying_renames",
    0,
    loaded.categoryResolution.pendingRenames.length,
  );
  await applyPendingRenames(params.userId, loaded.categoryResolution.pendingRenames);
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
  const map = await applyPendingCreates(
    params.userId,
    loaded.categoryResolution.pendingCreates,
    loaded.categoryResolution.map,
  );
  // Persist the resolved map so re-runs (post-crash) skip create work.
  await db
    .update(importJob)
    .set({
      categoryResolution: { ...loaded.categoryResolution, map, pendingCreates: [] },
    })
    .where(eq(importJob.id, params.jobId));
  return { resolvedCategoryMap: map };
}

export async function chunkedInsertStep(
  params: CommitWorkflowParams,
  loaded: Awaited<ReturnType<typeof loadJobStep>>,
  resolvedCategoryMap: Record<string, string>,
): Promise<{ imported: number; duplicates: number; excluded: number; cancelled: boolean }> {
  "use step";

  const uncategorizedId = await ensureUncategorizedCategory(params.userId);
  await setProgress(params.jobId, "inserting", 0, 0);
  const result = await insertCommitChunks({
    accountResolution: loaded.accountResolution,
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
  result: { imported: number; duplicates: number; excluded: number; cancelled: boolean },
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
