import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { eq } from "drizzle-orm";

/** Distinct source-account labels extracted from staged rows for Step 3 UI. */
export async function getStagedAccountLabels(jobId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: importStagedTransaction.sourceAccountName })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  return rows.flatMap((r) => (r.name ? [r.name] : []));
}
