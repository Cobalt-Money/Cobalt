import { db } from "@cobalt-web/db";
import { bankBalanceSnapshot } from "@cobalt-web/db/schema/banking";

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
export async function insertBalanceSnapshots(
  rows: BalanceSnapshotInsert[]
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    await db.insert(bankBalanceSnapshot).values(batch).onConflictDoNothing();
    inserted += batch.length;
  }
  return inserted;
}
