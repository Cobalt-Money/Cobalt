import { db } from "@cobalt-web/db";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";

import { lookupFinancialAccountsByPlaidIds } from "../link/queries.js";

function numToStr(value: number | string | boolean | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

export type SnapshotSource = "webhook" | "backfill";

export interface BalanceSnapshotInsert {
  availableBalance: number | null;
  creditLimit: number | null;
  currentBalance: number;
  plaidAccountId: string;
  snapshotDate: string;
  snapshotSource: SnapshotSource;
}

const INSERT_BATCH_SIZE = 100;

/** Batch-insert balance snapshots, skipping rows that already exist. */
export async function insertBalanceSnapshots(rows: BalanceSnapshotInsert[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const plaidAccountIds = [...new Set(rows.map((r) => r.plaidAccountId))];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const mapped = rows
    .map((r) => {
      const acct = accountMap.get(r.plaidAccountId);
      if (!acct) {
        return null;
      }
      // Liabilities (credit / loan) stored negative on snapshot — see
      // upsertDailySnapshotsForSource for the same convention.
      const liability = acct.type === "credit" || acct.type === "loan";
      const sign = liability ? -1 : 1;
      return {
        accountId: acct.id,
        available: numToStr(r.availableBalance),
        current: String(sign * r.currentBalance),
        limit: numToStr(r.creditLimit),
        snapshotDate: r.snapshotDate,
        source: "plaid" as const,
        userId: acct.userId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  let inserted = 0;
  for (let i = 0; i < mapped.length; i += INSERT_BATCH_SIZE) {
    const batch = mapped.slice(i, i + INSERT_BATCH_SIZE);
    await db
      .insert(snapshot)
      .values(batch)
      .onConflictDoNothing({
        target: [snapshot.accountId, snapshot.snapshotDate],
      });
    inserted += batch.length;
  }
  return inserted;
}
