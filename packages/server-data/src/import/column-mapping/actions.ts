import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { env } from "@cobalt-web/env/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error";
import { resolveAccountChoice } from "../account-mapping/actions";
import type { ConfirmColumnMappingBody } from "../shared/schemas";
import { parseFullCsv } from "../shared/parse-csv";
import { assertOwnedJob } from "../shared/queries";
import { parseRows } from "../upload/parse-rows";
import { cacheConfirmedMapping } from "./cache";
import { cacheRolesFromMapping } from "./per-name-cache";

/**
 * Persist confirmed `CsvMapping`, re-parse the upload from blob storage into
 * staged transactions, and advance status to `column_mapped`. Idempotent:
 * re-confirming wipes prior staged rows and re-parses from scratch.
 */
export async function confirmColumnMapping(
  userId: string,
  jobId: string,
  body: ConfirmColumnMappingBody,
): Promise<{ staged: number; rejected: number }> {
  const job = await assertOwnedJob(userId, jobId);
  if (!job.fileKey) {
    console.error("[confirmColumnMapping] job loaded without fileKey", {
      hasFileKey: "fileKey" in job,
      jobId,
      keys: Object.keys(job),
      status: job.status,
    });
    throw new ApiError(409, "upload_missing", "Import job has no uploaded file");
  }
  const result = await get(job.fileKey, {
    access: "private",
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200) {
    throw new ApiError(
      502,
      "upload_blob_unreadable",
      `Failed to fetch upload blob: ${String(result?.statusCode ?? "no result")}`,
    );
  }
  const text = await new Response(result.stream).text();
  const rows = await parseFullCsv(text);

  const { rejected, staged } = parseRows({
    defaultAccountName: body.defaultAccountName ?? "Default",
    defaultDate: body.defaultDate,
    mapping: body.mapping,
    rows,
  });

  await db.transaction(async (tx) => {
    await tx.delete(importStagedTransaction).where(eq(importStagedTransaction.importJobId, jobId));
    if (staged.length > 0) {
      await tx.insert(importStagedTransaction).values(
        staged.map((s) => ({
          amount: s.amount.toFixed(4),
          date: s.date,
          externalId: s.externalId,
          importJobId: jobId,
          isSplit: s.isSplit,
          isTransfer: s.isTransfer,
          merchant: s.merchant,
          notes: s.notes,
          originalDescription: s.originalDescription,
          rawBlob: s.rawBlob,
          sourceAccountName: s.sourceAccountName,
          sourceCategoryName: s.sourceCategoryName,
          tags: s.tags,
        })),
      );
    }
    if (rejected.length > 0) {
      await tx.insert(importStagedTransaction).values(
        rejected.map((r) => ({
          // Placeholder values for rejected rows so they're visible in the failed-rows UI.
          amount: "0.0000",
          date: "1970-01-01",
          importJobId: jobId,
          merchant: "",
          parseError: r.reason,
          rawBlob: r.raw,
          sourceAccountName: "",
        })),
      );
    }
    await tx
      .update(importJob)
      .set({ schemaConfirmedAt: new Date(), schemaMapping: body.mapping, status: "column_mapped" })
      .where(eq(importJob.id, jobId));
  });

  // Pre-resolved single-account path: skip Step 3 entirely and write accountResolution now.
  // Honored only when mapping.account === null (Path B). When account column exists (Path A),
  // we still need per-label resolution in Step 3 even if the user picked a default account.
  if (body.singleAccountChoice && body.mapping.account === null) {
    const resolved = await resolveAccountChoice(
      userId,
      body.singleAccountChoice.kind === "existing"
        ? { accountId: body.singleAccountChoice.accountId, kind: "existing" }
        : {
            institutionLogoDomain: body.singleAccountChoice.institutionLogoDomain,
            institutionName: body.singleAccountChoice.institutionName,
            kind: "create",
            name: body.singleAccountChoice.name,
            subtype: "Checking",
            type: "depository",
          },
    );
    const resolution =
      resolved.kind === "existing"
        ? { accountId: resolved.accountId, kind: "single" as const }
        : { kind: "single" as const, pendingCreate: resolved.create };
    await db
      .update(importJob)
      .set({
        accountResolution: resolution,
        status: "account_mapped",
      })
      .where(eq(importJob.id, jobId));
  }

  if (job.originalFilename && job.headers.length > 0) {
    await cacheConfirmedMapping(userId, job.headers, body.mapping);
    await cacheRolesFromMapping(userId, job.headers, body.mapping);
  }

  return { rejected: rejected.length, staged: staged.length };
}
