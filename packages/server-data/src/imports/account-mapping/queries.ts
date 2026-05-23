import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { eq } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error.js";

/** Distinct source-account labels extracted from staged rows for Step 3 UI. */
export async function getStagedAccountLabels(jobId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: importStagedTransaction.sourceAccountName })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  return rows.flatMap((r) => (r.name ? [r.name] : []));
}

/**
 * Returns the import job's account-mapping state, scoped to the user.
 * Throws ApiError 404 if missing or not owned — neutral, never differentiates.
 */
export async function getJob(userId: string, jobId: string) {
  const job = await db.query.importJob.findFirst({
    columns: { accountSuggestions: true, schemaMapping: true },
    where: { id: { eq: jobId }, userId: { eq: userId } },
  });
  if (!job) {
    throw new ApiError(404, "import_job_not_found", "Import job not found");
  }
  return job;
}

/** User's financial accounts in the shape the mapping agent + UI need. */
export async function listAccounts(userId: string) {
  const rows = await db.query.financialAccount.findMany({
    columns: {
      customName: true,
      id: true,
      institutionName: true,
      mask: true,
      name: true,
      officialName: true,
      subtype: true,
      type: true,
    },
    where: { userId: { eq: userId } },
    with: { plaidConnection: { columns: { institutionName: true } } },
  });
  return rows.map((a) => ({
    customName: a.customName,
    id: a.id,
    institutionName: a.institutionName ?? a.plaidConnection?.institutionName ?? null,
    mask: a.mask,
    name: a.name,
    officialName: a.officialName,
    subtype: a.subtype,
    type: a.type,
  }));
}
