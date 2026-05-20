import { db } from "@cobalt-web/db";

import { ApiError } from "../../../_shared/api-error.js";
import type { DuplicateCheckCandidate } from "./lib.js";
import { matchesDuplicateAccountMask } from "./lib.js";

export interface AccountRef {
  id: string;
  userId: string;
  type: string | null;
}

/**
 * Resolve financial_account rows for a batch of Plaid external account_ids.
 * Returns a Map keyed by Plaid account_id. Missing entries = orphaned/unsynced.
 */
export async function lookupFinancialAccountsByPlaidIds(
  plaidAccountIds: string[],
): Promise<Map<string, AccountRef>> {
  if (plaidAccountIds.length === 0) {
    return new Map();
  }
  const rows = await db.query.financialAccount.findMany({
    columns: { externalId: true, id: true, type: true, userId: true },
    where: {
      externalId: { in: plaidAccountIds },
      source: { eq: "plaid" },
    },
  });
  const map = new Map<string, AccountRef>();
  for (const r of rows) {
    if (r.externalId !== null) {
      map.set(r.externalId, { id: r.id, type: r.type, userId: r.userId });
    }
  }
  return map;
}

/**
 * Plaid-source financial accounts belonging to a plaid_connection.
 * Used by sync reconciliation to detect orphans (DB rows whose `externalId`
 * is no longer returned by Plaid).
 */
export async function listPlaidAccounts(connectionId: string) {
  return await db.query.financialAccount.findMany({
    columns: {
      externalId: true,
      id: true,
      mask: true,
      name: true,
      persistentAccountId: true,
      subtype: true,
      type: true,
    },
    where: {
      plaidConnectionId: { eq: connectionId },
      source: { eq: "plaid" },
    },
  });
}

/** Resolve financial_account.id by Plaid external account_id. */
export async function findPlaidAccountByExternalId(
  externalId: string,
): Promise<{ id: string } | null> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: externalId },
      source: { eq: "plaid" },
    },
  });
  return row ?? null;
}

/** Resolve plaid_connection by Plaid item_id. Returns null if not found. */
export async function lookupPlaidConnection(
  plaidItemId: string,
): Promise<{ id: string; userId: string } | null> {
  const row = await db.query.plaidConnection.findFirst({
    columns: { id: true, userId: true },
    where: { plaidItemId: { eq: plaidItemId } },
  });
  return row ?? null;
}

/** Fetch a plaid_connection row by Plaid item ID. Throws when not found. */
export async function getBankConnectionByItemId(plaidItemId: string) {
  const item = await db.query.plaidConnection.findFirst({
    where: { plaidItemId: { eq: plaidItemId } },
  });

  if (!item) {
    throw new Error(`Plaid item not found: ${plaidItemId}`);
  }
  return item;
}

/**
 * Get access token for a Plaid item with ownership check.
 * Throws if item not found or user doesn't own it.
 */
export async function getAccessTokenForItem(userId: string, plaidItemId: string): Promise<string> {
  const row = await db.query.plaidConnection.findFirst({
    columns: { plaidAccessToken: true },
    where: {
      plaidItemId: { eq: plaidItemId },
      userId: { eq: userId },
    },
  });

  if (!row) {
    // Neutral error: do not distinguish "missing" from "not owned by caller".
    throw new ApiError(404, "plaid_item_not_found", "Plaid item not found");
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
  newAccounts: DuplicateCheckCandidate[],
): Promise<{
  isDuplicate: boolean;
  duplicateAccounts: { name: string; createdAt: Date }[];
}> {
  if (!institutionId) {
    return { duplicateAccounts: [], isDuplicate: false };
  }

  const connections = await db.query.plaidConnection.findMany({
    columns: { createdAt: true, id: true },
    where: {
      institutionId: { eq: institutionId },
      userId: { eq: userId },
    },
  });

  if (connections.length === 0) {
    return { duplicateAccounts: [], isDuplicate: false };
  }

  const connectionIds = connections.map((c) => c.id);
  const createdAtById = new Map(connections.map((c) => [c.id, c.createdAt]));

  const accounts = await db.query.financialAccount.findMany({
    columns: {
      mask: true,
      name: true,
      persistentAccountId: true,
      plaidConnectionId: true,
      type: true,
    },
    where: {
      plaidConnectionId: { in: connectionIds },
      source: { eq: "plaid" },
    },
  });

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
  institutionId: string,
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
  const row = await db.query.plaidConnection.findFirst({
    columns: {
      id: true,
      institutionName: true,
      plaidAccessToken: true,
      plaidItemId: true,
    },
    where: {
      error: { isNull: true },
      institutionId: { eq: institutionId },
      pendingDisconnectAt: { isNull: true },
      userId: { eq: userId },
    },
    with: {
      institution: {
        columns: { logo: true, url: true },
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    institutionLogo: row.institution?.logo ?? null,
    institutionName: row.institutionName,
    institutionUrl: row.institution?.url ?? null,
    plaidAccessToken: row.plaidAccessToken,
    plaidItemId: row.plaidItemId,
  };
}
