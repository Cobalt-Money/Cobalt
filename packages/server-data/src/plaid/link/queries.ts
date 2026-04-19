import { db } from "@cobalt-web/db";

import { matchesDuplicateAccountMask } from "./lib.js";

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
 * Compares institution_id + mask + type to detect existing accounts.
 */
export async function checkForDuplicateAccounts(
  userId: string,
  institutionId: string | null,
  newAccounts: { mask: string | null; type: string; name: string }[]
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
      type: a.type,
    }))
  );

  const duplicateAccounts = newAccounts.flatMap((newAccount) => {
    const match = existingAccounts.find((existing) =>
      matchesDuplicateAccountMask(newAccount, existing)
    );
    return match ? [{ createdAt: match.createdAt, name: match.name }] : [];
  });

  return {
    duplicateAccounts,
    isDuplicate: duplicateAccounts.length > 0,
  };
}
