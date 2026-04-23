import { db } from "@cobalt-web/db";
import { bankConnection } from "@cobalt-web/db/schema/banking";
import { eq } from "drizzle-orm";

import type { DuplicateCheckCandidate } from "./lib.js";
import { matchesDuplicateAccountMask } from "./lib.js";

/** Fetch a bankConnection row by Plaid item ID. Throws when not found. */
export async function getBankConnectionByItemId(plaidItemId: string) {
  const [item] = await db
    .select()
    .from(bankConnection)
    .where(eq(bankConnection.plaidItemId, plaidItemId))
    .limit(1);

  if (!item) {
    throw new Error(`Plaid item not found: ${plaidItemId}`);
  }
  return item;
}

/**
 * Get access token for a Plaid item with ownership check.
 * Throws if item not found or user doesn't own it.
 */
export async function getAccessTokenForItem(
  userId: string,
  plaidItemId: string
): Promise<string> {
  const item = await db.query.bankConnection.findFirst({
    columns: { plaidAccessToken: true },
    where: {
      AND: [{ plaidItemId: { eq: plaidItemId } }, { userId: { eq: userId } }],
    },
  });

  if (!item) {
    throw new Error("Item not found or access denied");
  }

  return item.plaidAccessToken;
}

/**
 * Check for duplicate accounts before linking.
 *
 * Primary match: Plaid's `persistent_account_id` (stable across re-links, renames,
 * mask changes). Fallback for accounts where Plaid didn't provide one: the
 * legacy institution_id + mask + type heuristic.
 */
export async function checkForDuplicateAccounts(
  userId: string,
  institutionId: string | null,
  newAccounts: DuplicateCheckCandidate[]
): Promise<{
  isDuplicate: boolean;
  duplicateAccounts: { name: string; createdAt: Date }[];
}> {
  if (!institutionId) {
    return { duplicateAccounts: [], isDuplicate: false };
  }

  const connections = await db.query.bankConnection.findMany({
    where: {
      AND: [
        { userId: { eq: userId } },
        { institutionId: { eq: institutionId } },
      ],
    },
    with: {
      accounts: true,
    },
  });

  const existingAccounts = connections.flatMap((c) =>
    c.accounts.map((a) => ({
      createdAt: c.createdAt,
      mask: a.mask,
      name: a.name,
      persistentAccountId: a.persistentAccountId,
      type: a.type,
    }))
  );

  const duplicateAccounts = newAccounts.flatMap((newAccount) => {
    const match = existingAccounts.find((existing) => {
      if (
        newAccount.persistentAccountId &&
        existing.persistentAccountId &&
        newAccount.persistentAccountId === existing.persistentAccountId
      ) {
        return true;
      }
      return matchesDuplicateAccountMask(newAccount, existing);
    });
    return match ? [{ createdAt: match.createdAt, name: match.name }] : [];
  });

  return {
    duplicateAccounts,
    isDuplicate: duplicateAccounts.length > 0,
  };
}
