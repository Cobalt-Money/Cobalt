import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { and, count, eq, isNull, sql } from "drizzle-orm";

/**
 * Final validation before the commit workflow runs. Upload gates only see file
 * structure; this is the only place we can check that the confirmed mapping +
 * resolutions actually produce something committable.
 *
 * `blocked` → commit must not run. `warnings` → surfaced to the user, who can
 * proceed anyway by passing `override: true` on the commit request.
 */
export interface PreCommitGateResult {
  blocked: boolean;
  reasons: string[];
  warnings: string[];
}

const FUTURE_DATE_SLACK_DAYS = 7;

export async function runPreCommitGate(
  userId: string,
  jobId: string,
): Promise<PreCommitGateResult> {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const job = await db.query.importJob.findFirst({
    columns: { accountResolution: true, schemaMapping: true, userId: true },
    where: { id: { eq: jobId } },
  });
  if (!job || job.userId !== userId) {
    return { blocked: true, reasons: ["Import job not found."], warnings: [] };
  }

  if (!job.schemaMapping) {
    reasons.push("Column mapping is not confirmed.");
  }

  // Staged = usable rows; rejected = rows the parser flagged. `staged === 0` covers
  // both an empty file and a whole essential column being blank (every row rejected).
  const [counts] = await db
    .select({
      staged:
        sql<number>`count(*) filter (where ${importStagedTransaction.parseError} is null)`.mapWith(
          Number,
        ),
      total: count(),
    })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  const staged = counts?.staged ?? 0;
  const total = counts?.total ?? 0;
  const rejected = total - staged;

  if (staged === 0) {
    reasons.push("Your column mapping produced no usable rows.");
  }
  if (total > 0 && rejected / total > 0.5) {
    warnings.push(
      `More than half the rows (${String(rejected)}/${String(total)}) failed to parse — check your column mapping.`,
    );
  }

  if (job.accountResolution) {
    const res = job.accountResolution;
    const allSkip = res.kind === "perLabel" && Object.values(res.map).every((v) => v === "skip");
    if (allSkip) {
      reasons.push("Every account is set to skip — nothing would be imported.");
    }
  }

  // Future-dated rows past a small slack window usually mean a misparsed date format.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + FUTURE_DATE_SLACK_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const [future] = await db
    .select({
      maxDate: sql<string | null>`max(${importStagedTransaction.date})`,
    })
    .from(importStagedTransaction)
    .where(
      and(
        eq(importStagedTransaction.importJobId, jobId),
        isNull(importStagedTransaction.parseError),
      ),
    );
  if (future?.maxDate && future.maxDate > cutoffIso) {
    warnings.push(
      `Some transactions are dated in the future (latest: ${future.maxDate}) — the date format may be misparsed.`,
    );
  }

  return { blocked: reasons.length > 0, reasons, warnings };
}
