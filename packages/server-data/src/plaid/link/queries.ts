import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/banking/financial-account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { DuplicateCheckCandidate } from "./lib.js";
import { matchesDuplicateAccountMask } from "./lib.js";

export interface AccountRef {
  id: string;
  userId: string;
}

/**
 * Resolve financial_account rows for a batch of Plaid external account_ids.
 * Returns a Map keyed by Plaid account_id. Missing entries = orphaned/unsynced.
 */
export async function lookupFinancialAccountsByPlaidIds(
  plaidAccountIds: string[]
): Promise<Map<string, AccountRef>> {
  if (plaidAccountIds.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({
      externalId: financialAccount.externalId,
      id: financialAccount.id,
      userId: financialAccount.userId,
    })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        inArray(financialAccount.externalId, plaidAccountIds)
      )
    );
  const map = new Map<string, AccountRef>();
  for (const r of rows) {
    if (r.externalId !== null) {
      map.set(r.externalId, { id: r.id, userId: r.userId });
    }
  }
  return map;
}

/** Resolve plaid_connection by Plaid item_id. Returns null if not found. */
export async function lookupPlaidConnection(
  plaidItemId: string
): Promise<{ id: string; userId: string } | null> {
  const rows = await db
    .select({ id: plaidConnection.id, userId: plaidConnection.userId })
    .from(plaidConnection)
    .where(eq(plaidConnection.plaidItemId, plaidItemId))
    .limit(1);
  return rows[0] ?? null;
}

/** Fetch a plaid_connection row by Plaid item ID. Throws when not found. */
export async function getBankConnectionByItemId(plaidItemId: string) {
  const [item] = await db
    .select()
    .from(plaidConnection)
    .where(eq(plaidConnection.plaidItemId, plaidItemId))
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
  const [row] = await db
    .select({ plaidAccessToken: plaidConnection.plaidAccessToken })
    .from(plaidConnection)
    .where(
      and(
        eq(plaidConnection.plaidItemId, plaidItemId),
        eq(plaidConnection.userId, userId)
      )
    )
    .limit(1);

  if (!row) {
    throw new Error("Item not found or access denied");
  }

  return row.plaidAccessToken;
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

  const connections = await db
    .select({
      createdAt: plaidConnection.createdAt,
      id: plaidConnection.id,
    })
    .from(plaidConnection)
    .where(
      and(
        eq(plaidConnection.userId, userId),
        eq(plaidConnection.institutionId, institutionId)
      )
    );

  if (connections.length === 0) {
    return { duplicateAccounts: [], isDuplicate: false };
  }

  const connectionIds = connections.map((c) => c.id);
  const createdAtById = new Map(connections.map((c) => [c.id, c.createdAt]));

  const accounts = await db
    .select({
      mask: financialAccount.mask,
      name: financialAccount.name,
      persistentAccountId: financialAccount.persistentAccountId,
      plaidConnectionId: financialAccount.plaidConnectionId,
      type: financialAccount.type,
    })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        inArray(financialAccount.plaidConnectionId, connectionIds)
      )
    );

  const existingAccounts = accounts.map((a) => ({
    createdAt: a.plaidConnectionId
      ? (createdAtById.get(a.plaidConnectionId) ?? new Date(0))
      : new Date(0),
    mask: a.mask,
    name: a.name,
    persistentAccountId: a.persistentAccountId,
    type: a.type,
  }));

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

/**
 * Find a healthy existing plaid_connection for this user at the given Plaid
 * institution. Used to detect Scenario C — re-linking an institution the user
 * already has a working connection at — so we can mint an update-mode link
 * token and avoid creating a second Plaid Item (cost leak).
 *
 * Skips connections in a Plaid error state or pending disconnect — those
 * should fall through to a fresh re-link rather than update mode.
 */
export async function findExistingHealthyConnection(
  userId: string,
  institutionId: string
): Promise<{
  id: string;
  plaidAccessToken: string;
  plaidItemId: string;
  institutionName: string | null;
  institutionLogo: string | null;
  institutionUrl: string | null;
} | null> {
  // Left-join to `institution` because `plaid_connection.institutionLogo` is
  // stored as null during onboarding — the real logo + URL live in the
  // institution table keyed by `plaid_institution_id`.
  const [row] = await db
    .select({
      id: plaidConnection.id,
      institutionLogo: institution.logo,
      institutionName: plaidConnection.institutionName,
      institutionUrl: institution.url,
      plaidAccessToken: plaidConnection.plaidAccessToken,
      plaidItemId: plaidConnection.plaidItemId,
    })
    .from(plaidConnection)
    .leftJoin(
      institution,
      eq(institution.plaidInstitutionId, plaidConnection.institutionId)
    )
    .where(
      and(
        eq(plaidConnection.userId, userId),
        eq(plaidConnection.institutionId, institutionId),
        isNull(plaidConnection.error),
        isNull(plaidConnection.pendingDisconnectAt)
      )
    )
    .limit(1);

  return row ?? null;
}
