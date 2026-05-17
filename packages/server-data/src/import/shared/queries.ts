import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import type { PendingAccountCreate } from "@cobalt-web/db/schema/imports/import-job";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import type { ImportStatusResponse } from "./schemas";

export interface ResumableImportJob {
  id: string;
  originalFilename: string | null;
  status: "uploaded" | "column_mapped" | "account_mapped" | "category_mapped" | "committing";
  createdAt: string;
}

const RESUMABLE_STATUSES = [
  "uploaded",
  "column_mapped",
  "account_mapped",
  "category_mapped",
  "committing",
] as const;

export async function listResumableImportJobs(userId: string): Promise<ResumableImportJob[]> {
  const rows = await db
    .select({
      createdAt: importJob.createdAt,
      id: importJob.id,
      originalFilename: importJob.originalFilename,
      status: importJob.status,
    })
    .from(importJob)
    .where(and(eq(importJob.userId, userId), inArray(importJob.status, [...RESUMABLE_STATUSES])))
    .orderBy(desc(importJob.createdAt));
  return rows.map((r) => ({
    createdAt: r.createdAt.toISOString(),
    id: r.id,
    originalFilename: r.originalFilename,
    status: r.status as ResumableImportJob["status"],
  }));
}

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

/** A handful of successfully-staged rows for the commit-screen sanity preview. */
export async function getStagedPreview(
  jobId: string,
  limit = 5,
): Promise<
  {
    amount: string;
    date: string;
    merchant: string;
    sourceAccountName: string;
    sourceCategoryName: string | null;
  }[]
> {
  const rows = await db.query.importStagedTransaction.findMany({
    columns: {
      amount: true,
      date: true,
      merchant: true,
      sourceAccountName: true,
      sourceCategoryName: true,
    },
    limit,
    where: {
      importJobId: { eq: jobId },
      parseError: { isNull: true },
    },
  });
  return rows.map((r) => ({
    amount: r.amount,
    date: r.date,
    merchant: r.merchant,
    sourceAccountName: r.sourceAccountName,
    sourceCategoryName: r.sourceCategoryName,
  }));
}

/**
 * Full staged-row set (incl. rejected) for the expanded mini-table view. Capped.
 * `tagsMapped` reflects whether the user's column mapping assigned a tags column —
 * the table only shows the Tags column when it did.
 */
export async function getStagedRows(
  jobId: string,
  limit = 500,
): Promise<{
  rows: {
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
  }[];
  tagsMapped: boolean;
}> {
  const job = await db.query.importJob.findFirst({
    columns: { schemaMapping: true },
    where: { id: { eq: jobId } },
  });
  const rows = await db.query.importStagedTransaction.findMany({
    columns: {
      amount: true,
      date: true,
      id: true,
      merchant: true,
      notes: true,
      originalDescription: true,
      parseError: true,
      sourceAccountName: true,
      sourceCategoryName: true,
      tags: true,
    },
    limit,
    where: { importJobId: { eq: jobId } },
  });
  return {
    rows: rows.map((r) => ({
      amount: r.amount,
      date: r.date,
      id: r.id,
      merchant: r.merchant,
      notes: r.notes,
      originalDescription: r.originalDescription,
      parseError: r.parseError,
      sourceAccountName: r.sourceAccountName,
      sourceCategoryName: r.sourceCategoryName,
      tags: r.tags ?? [],
    })),
    tagsMapped: Boolean(job?.schemaMapping?.tags),
  };
}

const PENDING_PREFIX = "__pending:";

export interface ImportResolutions {
  /** Source account label → accountId | `pending:<key>` | "skip". Empty for single-account. */
  accountByLabel: Record<string, string>;
  /** Set when every row maps to one account: an accountId or `pending:__single__`. */
  singleAccountId: string | null;
  /** Accounts the user chose to "Create new" — not real `financial_account` rows until commit. */
  pendingAccounts: {
    institutionLogoDomain: string | null;
    institutionName: string | null;
    key: string;
    name: string;
    subtype: string;
    type: string;
  }[];
  /** Source category label → categoryId | `pending:<sourceLabel>`. */
  categoryByLabel: Record<string, string>;
  /** Categories the user chose to "Create new" — not real `category` rows until commit. */
  pendingCategories: {
    color: string | null;
    groupId: string;
    iconKey: string;
    name: string;
    sourceLabel: string;
  }[];
}

/**
 * The account + category decisions the user already confirmed for this import.
 * The expanded-preview UI seeds its pickers from this so every row shows its
 * resolved account/category (with logo/icon) by default — including the
 * not-yet-created "pending" accounts and categories.
 */
export async function getImportResolutions(jobId: string): Promise<ImportResolutions> {
  const job = await db.query.importJob.findFirst({
    columns: { accountResolution: true, categoryResolution: true },
    where: { id: { eq: jobId } },
  });

  const accountByLabel: Record<string, string> = {};
  let singleAccountId: string | null = null;
  const pendingAccounts: ImportResolutions["pendingAccounts"] = [];
  const seenAccountKeys = new Set<string>();
  const pushPendingAccount = (key: string, pc: PendingAccountCreate) => {
    if (seenAccountKeys.has(key)) {
      return;
    }
    seenAccountKeys.add(key);
    pendingAccounts.push({
      institutionLogoDomain: pc.institutionLogoDomain ?? null,
      institutionName: pc.institutionName ?? null,
      key,
      name: pc.name,
      subtype: pc.subtype,
      type: pc.type,
    });
  };

  const ar = job?.accountResolution;
  if (ar?.kind === "single") {
    if ("pendingCreate" in ar) {
      pushPendingAccount("__single__", ar.pendingCreate);
      singleAccountId = "pending:__single__";
    } else {
      singleAccountId = ar.accountId;
    }
  } else if (ar?.kind === "perLabel") {
    for (const [label, value] of Object.entries(ar.map)) {
      if (value === "skip" || typeof value === "string") {
        accountByLabel[label] = value;
      } else {
        pushPendingAccount(label, value);
        accountByLabel[label] = `pending:${label}`;
      }
    }
  }

  const categoryByLabel: Record<string, string> = {};
  const pendingCategories: ImportResolutions["pendingCategories"] = [];
  const cr = job?.categoryResolution;
  if (cr) {
    for (const [label, value] of Object.entries(cr.map)) {
      // `__pending:<sourceLabel>` placeholders mean a category materialised at commit.
      categoryByLabel[label] = value.startsWith(PENDING_PREFIX)
        ? `pending:${value.slice(PENDING_PREFIX.length)}`
        : value;
    }
    for (const pc of cr.pendingCreates) {
      pendingCategories.push({
        color: pc.color ?? null,
        groupId: pc.groupId,
        iconKey: pc.iconKey,
        name: pc.name,
        sourceLabel: pc.sourceLabel,
      });
    }
  }

  return { accountByLabel, categoryByLabel, pendingAccounts, pendingCategories, singleAccountId };
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
