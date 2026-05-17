import { db } from "@cobalt-web/db";

export async function getRawRowsHeaders(jobId: string): Promise<string[]> {
  const job = await db.query.importJob.findFirst({
    columns: { headers: true },
    where: { id: { eq: jobId } },
  });
  return job?.headers ?? [];
}

export async function getRawSampleRows(
  jobId: string,
  limit: number,
): Promise<Record<string, string>[]> {
  const job = await db.query.importJob.findFirst({
    columns: { sampleRows: true },
    where: { id: { eq: jobId } },
  });
  return (job?.sampleRows ?? []).slice(0, limit);
}
