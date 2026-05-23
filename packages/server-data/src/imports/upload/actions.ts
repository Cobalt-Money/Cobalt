import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { env } from "@cobalt-web/env/server";
import { put } from "@vercel/blob";
import { and, eq, gte, isNotNull } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error";
import { ImportGateError, runGates } from "./gates";

const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const SAMPLE_ROW_COUNT = 20;

/**
 * Run an uploaded file through Step 1 — structural gates + file-hash dupe
 * guard — and stash the raw bytes in Vercel Blob storage. Headers + a 20-row
 * sample land on `import_job` so Step 2 UI can render without a blob fetch.
 * Re-parse for staged transactions happens in Step 2 confirm against blob.
 */
export async function uploadAndStageImport({
  buffer,
  filename,
  userId,
}: {
  buffer: Buffer;
  filename: string;
  userId: string;
}): Promise<{
  jobId: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
}> {
  const gate = runGates(buffer, filename);

  // 30-day duplicate-import guard. Surfaces the prior job so the UI can link to it.
  // If the prior job is still in-progress (non-terminal status), resume it instead
  // of failing — same CSV re-uploaded mid-flow should pick up where it left off.
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const prior = await db
    .select({
      filename: importJob.originalFilename,
      headers: importJob.headers,
      id: importJob.id,
      sampleRows: importJob.sampleRows,
      status: importJob.status,
    })
    .from(importJob)
    .where(
      and(
        eq(importJob.userId, userId),
        eq(importJob.fileHash, gate.fileHash),
        gte(importJob.createdAt, cutoff),
        isNotNull(importJob.fileKey),
      ),
    )
    .limit(1);
  const [priorJob] = prior;
  if (priorJob) {
    const isTerminal =
      priorJob.status === "committed" ||
      priorJob.status === "cancelled" ||
      priorJob.status === "failed";
    if (isTerminal) {
      const label = priorJob.filename ?? filename;
      throw new ImportGateError(
        "DUPLICATE_FILE",
        `"${label}" was already imported in the last 30 days.`,
      );
    }
    // Non-terminal prior job — return its id so the UI resumes the existing flow.
    // totalRows isn't relevant on the resumed upload response; UI jumps past upload step.
    return {
      headers: priorJob.headers,
      jobId: priorJob.id,
      sampleRows: priorJob.sampleRows ?? [],
      totalRows: 0,
    };
  }

  const [job] = await db
    .insert(importJob)
    .values({
      fileHash: gate.fileHash,
      headers: gate.headers,
      originalFilename: filename,
      sampleRows: gate.rows.slice(0, SAMPLE_ROW_COUNT),
      source: "csv",
      status: "uploaded",
      userId,
    })
    .returning({ id: importJob.id });
  if (!job) {
    throw new ApiError(500, "import_job_create_failed", "Failed to create import job");
  }

  let blob;
  try {
    blob = await put(`${userId}/imports/${job.id}.csv`, buffer, {
      access: "private",
      contentType: "text/csv",
      token: env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    await db.delete(importJob).where(eq(importJob.id, job.id));
    throw error;
  }

  await db.update(importJob).set({ fileKey: blob.url }).where(eq(importJob.id, job.id));

  return {
    headers: gate.headers,
    jobId: job.id,
    sampleRows: gate.rows.slice(0, SAMPLE_ROW_COUNT),
    totalRows: gate.totalRows,
  };
}
