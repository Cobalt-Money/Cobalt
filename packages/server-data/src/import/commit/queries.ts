import { db } from "@cobalt-web/db";
import type {
  AccountResolution,
  CategoryResolution,
} from "@cobalt-web/db/schema/imports/import-job";

/** Read whether the job has been cancelled by the user mid-commit. */
export async function isJobCancelled(jobId: string): Promise<boolean> {
  const job = await db.query.importJob.findFirst({
    columns: { cancelledAt: true },
    where: { id: { eq: jobId } },
  });
  return Boolean(job?.cancelledAt);
}

/**
 * Load + assert the resolutions required to commit. Throws when the job
 * doesn't exist, belongs to another user, or hasn't reached the
 * `account_mapped`/`category_mapped` checkpoints.
 */
export async function loadCommitResolutions(
  userId: string,
  jobId: string,
): Promise<{ accountResolution: AccountResolution; categoryResolution: CategoryResolution }> {
  const job = await db.query.importJob.findFirst({
    columns: { accountResolution: true, categoryResolution: true, userId: true },
    where: { id: { eq: jobId } },
  });
  if (!job || job.userId !== userId) {
    throw new Error("Import job not found");
  }
  if (!job.accountResolution) {
    throw new Error("Account mapping not confirmed");
  }
  if (!job.categoryResolution) {
    throw new Error("Category mapping not confirmed");
  }
  return {
    accountResolution: job.accountResolution,
    categoryResolution: job.categoryResolution,
  };
}
