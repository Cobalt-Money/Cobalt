import { db } from "@cobalt-web/db";
import { bankBalanceSnapshot } from "@cobalt-web/db/schema/banking";
import { sql } from "drizzle-orm";

/**
 * Insert or update bank balance snapshots.
 * Uses ON CONFLICT to update if a snapshot already exists for the account/date.
 */
export async function insertBankBalanceSnapshots(
  values: {
    availableBalance: number | null;
    creditLimit: number | null;
    currentBalance: number;
    plaidAccountId: string;
    snapshotDate: string;
    snapshotSource: string;
  }[]
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  await db
    .insert(bankBalanceSnapshot)
    .values(values)
    .onConflictDoUpdate({
      set: {
        availableBalance: sql`excluded.available_balance`,
        creditLimit: sql`excluded.credit_limit`,
        currentBalance: sql`excluded.current_balance`,
      },
      target: [
        bankBalanceSnapshot.plaidAccountId,
        bankBalanceSnapshot.snapshotDate,
      ],
    });
}
