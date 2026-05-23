import { db } from "@cobalt-web/db";
import type {
  AccountSuggestionPersisted,
  CategorySuggestionPersisted,
  CsvMapping,
} from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { env } from "@cobalt-web/env/server";
import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";

import { assertOwnedJob } from "./queries";
import type { UpdateStagedRow } from "./schemas";

/** Flip a confirmed job into the `committing` state at the start of the workflow. */
export async function markImportJobCommitting(jobId: string): Promise<void> {
  await db.update(importJob).set({ status: "committing" }).where(eq(importJob.id, jobId));
}

export async function markImportJobFailed(jobId: string, message: string): Promise<void> {
  await db
    .update(importJob)
    .set({ errorMessage: message, status: "failed" })
    .where(eq(importJob.id, jobId));
}

export async function markImportJobCancelled(jobId: string): Promise<void> {
  await db
    .update(importJob)
    .set({ cancelledAt: new Date(), status: "cancelled" })
    .where(eq(importJob.id, jobId));
}

export async function setProgress(
  jobId: string,
  step: "loading" | "applying_creates" | "inserting" | "finalizing",
  done: number,
  total: number,
): Promise<void> {
  await db
    .update(importJob)
    .set({
      progress: {
        done,
        startedAt: new Date().toISOString(),
        step,
        total,
        updatedAt: new Date().toISOString(),
      },
    })
    .where(eq(importJob.id, jobId));
}

export async function requestCancel(userId: string, jobId: string): Promise<void> {
  await assertOwnedJob(userId, jobId);
  await db.update(importJob).set({ cancelledAt: new Date() }).where(eq(importJob.id, jobId));
}

/**
 * Hard-delete an in-progress import job. Best-effort blob cleanup, then drop the
 * `import_job` row — FK cascade removes `import_staged_transaction` rows.
 * Caller (route) gates this to non-`committed` jobs so accepted transactions are
 * never lost.
 */
/** Persist the confirmed/inferred column mapping for a job. */
export async function persistSchemaMapping(jobId: string, mapping: CsvMapping): Promise<void> {
  await db.update(importJob).set({ schemaMapping: mapping }).where(eq(importJob.id, jobId));
}

/** Persist the AI account suggestions cache for a job. */
export async function persistAccountSuggestions(
  jobId: string,
  suggestions: AccountSuggestionPersisted[],
): Promise<void> {
  await db
    .update(importJob)
    .set({ accountSuggestions: suggestions })
    .where(eq(importJob.id, jobId));
}

/** Persist the AI category suggestions cache for a job. */
export async function persistCategorySuggestions(
  jobId: string,
  suggestions: CategorySuggestionPersisted[],
): Promise<void> {
  await db
    .update(importJob)
    .set({ categorySuggestions: suggestions })
    .where(eq(importJob.id, jobId));
}

/**
 * Patch editable fields on a single staged row. Account/category are per-label
 * (Steps 3/4), not per-row, so they are intentionally not updatable here.
 * Returns the updated row (REST convention); null when no matching row was found.
 */
export async function updateStagedRow(
  userId: string,
  jobId: string,
  rowId: string,
  patch: UpdateStagedRow,
): Promise<{
  amount: string;
  date: string;
  id: string;
  merchant: string;
  notes: string | null;
  originalDescription: string | null;
  parseError: string | null;
  sourceAccountName: string;
  sourceCategoryName: string | null;
  tags: string[];
} | null> {
  await assertOwnedJob(userId, jobId);
  const set: Record<string, unknown> = {};
  if (patch.amount !== undefined) {
    set.amount = patch.amount;
  }
  if (patch.date !== undefined) {
    set.date = patch.date;
  }
  if (patch.merchant !== undefined) {
    set.merchant = patch.merchant;
  }
  if (patch.notes !== undefined) {
    set.notes = patch.notes;
  }
  if (patch.originalDescription !== undefined) {
    set.originalDescription = patch.originalDescription;
  }
  const [row] = await db
    .update(importStagedTransaction)
    .set(set)
    .where(
      and(eq(importStagedTransaction.id, rowId), eq(importStagedTransaction.importJobId, jobId)),
    )
    .returning({
      amount: importStagedTransaction.amount,
      date: importStagedTransaction.date,
      id: importStagedTransaction.id,
      merchant: importStagedTransaction.merchant,
      notes: importStagedTransaction.notes,
      originalDescription: importStagedTransaction.originalDescription,
      parseError: importStagedTransaction.parseError,
      sourceAccountName: importStagedTransaction.sourceAccountName,
      sourceCategoryName: importStagedTransaction.sourceCategoryName,
      tags: importStagedTransaction.tags,
    });
  if (!row) {
    return null;
  }
  return { ...row, tags: row.tags ?? [] };
}

export async function deleteImportJob(userId: string, jobId: string): Promise<void> {
  const job = await assertOwnedJob(userId, jobId);
  if (job.fileKey) {
    try {
      await del(job.fileKey, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // Best-effort — orphan blob is preferable to a dead-end UI.
    }
  }
  await db.delete(importJob).where(eq(importJob.id, jobId));
}
