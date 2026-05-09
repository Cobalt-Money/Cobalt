import { db } from "@cobalt-web/db";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { eq } from "drizzle-orm";

import { assertOwnedJob } from "./queries";

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
  step: "loading" | "applying_renames" | "applying_creates" | "inserting" | "finalizing",
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
