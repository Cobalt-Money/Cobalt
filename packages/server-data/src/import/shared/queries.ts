import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { count, eq, sql } from "drizzle-orm";

import type { ImportStatusResponse } from "./schemas";

/**
 * Resolve a job for the UI: status + counts. Mapping content lives on the
 * `import_job` row directly (`schemaMapping`, `accountResolution`, etc.) and
 * is fetched separately by the per-step endpoints.
 */
export async function getImportJobStatus(
  userId: string,
  jobId: string,
): Promise<ImportStatusResponse | null> {
  const job = await db.query.importJob.findFirst({
    where: { id: { eq: jobId }, userId: { eq: userId } },
  });
  if (!job) {
    return null;
  }

  const counts = await db
    .select({
      rejected:
        sql<number>`count(*) filter (where ${importStagedTransaction.parseError} is not null)`.mapWith(
          Number,
        ),
      total: count(),
    })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  const totals = counts[0] ?? { rejected: 0, total: 0 };

  return {
    errorMessage: job.errorMessage,
    id: job.id,
    originalFilename: job.originalFilename,
    progress: job.progress
      ? {
          done: job.progress.done,
          message: job.progress.message,
          step: job.progress.step,
          total: job.progress.total,
        }
      : null,
    rejectedRows: totals.rejected,
    source: "csv",
    status: job.status,
    summary: job.summary
      ? {
          duplicates: job.summary.duplicates,
          excluded: job.summary.excluded,
          failed: job.summary.failed,
          imported: job.summary.imported,
        }
      : null,
    totalRows: totals.total,
  };
}

/** Failed-row table on the preview screen — capped to first 50. */
export async function getRejectedRows(
  jobId: string,
  limit = 50,
): Promise<{ rawBlob: unknown; reason: string }[]> {
  const rows = await db.query.importStagedTransaction.findMany({
    columns: { parseError: true, rawBlob: true },
    where: {
      importJobId: { eq: jobId },
      parseError: { isNotNull: true },
    },
  });
  return rows.slice(0, limit).map((r) => ({ rawBlob: r.rawBlob, reason: r.parseError ?? "" }));
}

/** Throws when the job doesn't exist or doesn't belong to the user. */
export async function assertOwnedJob(userId: string, jobId: string) {
  const job = await db.query.importJob.findFirst({
    where: { id: { eq: jobId }, userId: { eq: userId } },
  });
  if (!job) {
    throw new Error("Import job not found");
  }
  return job;
}
