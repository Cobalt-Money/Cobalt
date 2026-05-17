import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { eq } from "drizzle-orm";

/** Distinct source-category labels for Step 4 UI. */
export async function getStagedCategoryLabels(jobId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: importStagedTransaction.sourceCategoryName })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  return rows.flatMap((r) => (r.name ? [r.name] : []));
}
