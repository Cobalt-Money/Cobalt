import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * Snapshot of a pending row's user-edited state, carried forward to the
 * posted row in `applyPendingOverrides`. Holds every column referenced by
 * `LOCK_KEY_GUARDED_COLUMNS` plus `lockedFields` itself; the consumer
 * filters by `lockedFields` to decide which cols to actually write.
 */
export interface UserOverrides {
  address: string | null;
  categoryId: string | null;
  city: string | null;
  country: string | null;
  date: string;
  lat: number | null;
  lockedFields: string[];
  lon: number | null;
  merchantName: string | null;
  name: string;
  notes: string | null;
  postalCode: string | null;
  region: string | null;
  storeNumber: string | null;
  website: string | null;
}

/**
 * Returns user-edited overrides for pending transactions about to be
 * replaced by posted rows. Only returns rows with at least one locked
 * field — unlocked rows have nothing to carry forward.
 */
export async function getUserOverrides(
  transactionIds: string[],
): Promise<Map<string, UserOverrides>> {
  if (transactionIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      address: transactionTable.address,
      categoryId: transactionTable.categoryId,
      city: transactionTable.city,
      country: transactionTable.country,
      date: transactionTable.date,
      externalId: transactionTable.externalId,
      lat: transactionTable.lat,
      lockedFields: transactionTable.lockedFields,
      lon: transactionTable.lon,
      merchantName: transactionTable.merchantName,
      name: transactionTable.name,
      notes: transactionTable.notes,
      postalCode: transactionTable.postalCode,
      region: transactionTable.region,
      storeNumber: transactionTable.storeNumber,
      website: transactionTable.website,
    })
    .from(transactionTable)
    .where(
      and(
        eq(transactionTable.source, "plaid"),
        inArray(transactionTable.externalId, transactionIds),
        sql`jsonb_array_length(${transactionTable.lockedFields}) > 0`,
      ),
    );

  return new Map(
    rows
      .filter((row): row is typeof row & { externalId: string } => row.externalId !== null)
      .map((row) => {
        const { externalId: _externalId, ...rest } = row;
        return [row.externalId, rest];
      }),
  );
}
