import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { env } from "@cobalt-web/env/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";

import type { ConfirmColumnMappingBody } from "../shared/schemas";
import { parseFullCsv } from "../shared/parse-csv";
import { assertOwnedJob } from "../shared/queries";
import { parseRows } from "../upload/parse-rows";
import { cacheConfirmedMapping } from "./cache";

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
    throw new Error("Import job has no uploaded file");
  }
  const result = await get(job.fileKey, {
    access: "private",
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200) {
    throw new Error(`Failed to fetch upload blob: ${String(result?.statusCode ?? "no result")}`);
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

  if (job.originalFilename && job.headers.length > 0) {
    await cacheConfirmedMapping(userId, job.headers, body.mapping);
  }

  return { rejected: rejected.length, staged: staged.length };
}
