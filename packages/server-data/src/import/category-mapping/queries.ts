import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { eq } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error.js";

/** Distinct source-category labels for Step 4 UI. */
export async function getStagedCategoryLabels(jobId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: importStagedTransaction.sourceCategoryName })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  return rows.flatMap((r) => (r.name ? [r.name] : []));
}

/**
 * Returns the import job's category-mapping state, scoped to the user.
 * Throws ApiError 404 if missing or not owned — neutral, never differentiates.
 */
export async function getJob(userId: string, jobId: string) {
  const job = await db.query.importJob.findFirst({
    columns: { categorySuggestions: true },
    where: { id: { eq: jobId }, userId: { eq: userId } },
  });
  if (!job) {
    throw new ApiError(404, "import_job_not_found", "Import job not found");
  }
  return job;
}

/** User's categories in the shape needed for mapping UI + agent. */
export async function listCategories(userId: string) {
  return await db.query.category.findMany({
    columns: {
      groupId: true,
      iconKey: true,
      id: true,
      name: true,
      systemKey: true,
    },
    where: { userId: { eq: userId } },
  });
}

/** User's category groups for mapping UI. */
export async function listCategoryGroups(userId: string) {
  return await db.query.categoryGroup.findMany({
    columns: { id: true, name: true, systemKey: true },
    where: { userId: { eq: userId } },
  });
}
