import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";

import { detectSource, getAdapter } from "./registry";
import type { ImportSource, StagedTransaction } from "./types";

/**
 * Run an uploaded file through `detect → parse → normalize` and stage the rows.
 * Synchronous because Mint files are small (<10k rows, <5MB); when YNAB-API or
 * OFX adapters land we'll move parse+stage behind a dedicated workflow.
 *
 * Lives in its own module so the workflow bundle (which only needs the post-parse
 * mutators in `mutations.ts`) doesn't transitively import the parse adapters and
 * trip workflow's "no Node modules at top level" check via `papaparse`.
 */
export async function uploadAndStageImport({
  buffer,
  filename,
  userId,
}: {
  buffer: Buffer;
  filename: string;
  userId: string;
}): Promise<{ accounts: string[]; categories: string[]; jobId: string }> {
  const sample = buffer.toString("utf-8").slice(0, 4096);
  const source: ImportSource | null = detectSource(sample);
  if (!source) {
    throw new Error("Unrecognized file format. Expected a Mint CSV export.");
  }
  const adapter = getAdapter(source);

  const raw = await adapter.parse({ buffer, filename });
  const staged: StagedTransaction[] = adapter.normalize(raw, { userId });
  const accounts = adapter.extractAccounts(raw);
  const categories = adapter.extractCategories(raw);

  return await db.transaction(async (tx) => {
    const [job] = await tx
      .insert(importJob)
      .values({
        originalFilename: filename,
        source,
        status: "parsed",
        userId,
      })
      .returning({ id: importJob.id });
    if (!job) {
      throw new Error("Failed to create import job");
    }

    if (staged.length > 0) {
      await tx.insert(importStagedTransaction).values(
        staged.map((s) => ({
          amount: s.amount.toFixed(4),
          date: s.date,
          externalId: s.externalId,
          importJobId: job.id,
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

    return { accounts, categories, jobId: job.id };
  });
}
