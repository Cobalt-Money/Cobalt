import { db } from "@cobalt-web/db";

/** Read whether the job has been cancelled by the user mid-commit. */
export async function isJobCancelled(jobId: string): Promise<boolean> {
  const job = await db.query.importJob.findFirst({
    columns: { cancelledAt: true },
    where: { id: { eq: jobId } },
  });
  return Boolean(job?.cancelledAt);
}
