import { findDedupeMatch } from "@cobalt-web/server-data/import/dedupe";
import { markImportJobFailed, resolveAccountMap } from "@cobalt-web/server-data/import/mutations";
import {
  clearDedupeMatches,
  getDedupeCandidates,
  getStagedDateRangePerAccount,
  getStagedRowsForDedupe,
  setStagedDedupeMatch,
} from "@cobalt-web/server-data/import/queries";

export interface DedupeWorkflowParams {
  jobId: string;
  userId: string;
}

export interface DedupeWorkflowResult {
  error?: string;
  jobId: string;
  matchedCount?: number;
  scannedCount?: number;
  success: boolean;
}

/**
 * Resolve user-submitted account-mapping entries to concrete `financial_account.id`s.
 * `kind: "create"` entries become real manual accounts here; this is the only step
 * that mutates accounts as a side-effect of a mapping submission.
 */
export async function resolveAccountMapStep(params: DedupeWorkflowParams) {
  "use step";

  const resolved = await resolveAccountMap(params.userId, params.jobId);
  // Serialize for the workflow boundary (workflow steps must return JSON-safe values).
  return {
    entries: [...resolved.entries()].map(([sourceName, target]) => ({
      accountId: target.accountId,
      skip: target.skip,
      sourceName,
    })),
  };
}

/**
 * Reset prior dedupe state on the staged rows and run a fresh pass against the
 * existing-transactions pool for each mapped target account. Idempotent: a re-run
 * (e.g. user changed the mapping) starts from a clean slate.
 */
export async function runDedupePassStep(
  params: DedupeWorkflowParams,
  resolved: Awaited<ReturnType<typeof resolveAccountMapStep>>,
): Promise<{ matched: number; scanned: number }> {
  "use step";

  await clearDedupeMatches(params.jobId);

  const stagedRows = await getStagedRowsForDedupe(params.jobId);
  if (stagedRows.length === 0) {
    return { matched: 0, scanned: 0 };
  }

  const dateRanges = await getStagedDateRangePerAccount(params.jobId);

  // Per-account candidate cache: avoid refetching when many staged rows hit the same account.
  const candidatesByAccount = new Map<string, Awaited<ReturnType<typeof getDedupeCandidates>>>();
  const sourceToTarget = new Map(
    resolved.entries.map((e) => [e.sourceName, { accountId: e.accountId, skip: e.skip }]),
  );

  let matched = 0;
  for (const staged of stagedRows) {
    const target = sourceToTarget.get(staged.sourceAccountName);
    if (!target || target.skip || !target.accountId) {
      continue;
    }
    let candidates = candidatesByAccount.get(target.accountId);
    if (!candidates) {
      const range = dateRanges.get(staged.sourceAccountName);
      if (!range) {
        continue;
      }
      candidates = await getDedupeCandidates(params.userId, target.accountId, range.from, range.to);
      candidatesByAccount.set(target.accountId, candidates);
    }
    const matchId = findDedupeMatch(
      {
        amount: Number.parseFloat(staged.amount),
        date: staged.date,
        merchant: staged.merchant,
      },
      candidates,
    );
    if (matchId) {
      await setStagedDedupeMatch(staged.id, matchId);
      matched += 1;
    }
  }

  return { matched, scanned: stagedRows.length };
}

export async function failJobStep(jobId: string, message: string): Promise<void> {
  "use step";

  await markImportJobFailed(jobId, message);
}
