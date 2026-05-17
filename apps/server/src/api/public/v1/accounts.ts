import { getBankAccounts, getCreditCards } from "@cobalt-web/server-data/accounts/queries";
import { bankAccountListResponseSchema } from "@cobalt-web/server-data/accounts/schemas";
import type { BankAccountListItem } from "@cobalt-web/server-data/accounts/schemas";
import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";

const listRoute = createRoute({
  description:
    "All Plaid-connected bank, credit, and depository accounts for the authenticated user. Balances are sourced from the latest snapshot per account (not the live Plaid `balance` row), so manual + stale-feed accounts still surface a value.",
  method: "get",
  path: "/",
  responses: {
    200: jsonContent(bankAccountListResponseSchema, "List of accounts"),
  },
  summary: "List accounts",
  tags: ["Accounts"],
});

/**
 * For each `plaidAccountId`, keep the most recent snapshot by `snapshotDate`.
 * `getBalanceSnapshotsByUserId` returns oldest-first, so we overwrite as we
 * iterate — the last write per id is the latest.
 */
function indexLatestSnapshotsByAccountId(
  snapshots: Awaited<ReturnType<typeof getBalanceSnapshotsByUserId>>,
): Map<string, { creditLimit: number | null; current: number; snapshotDate: string }> {
  const latest = new Map<
    string,
    { creditLimit: number | null; current: number; snapshotDate: string }
  >();
  for (const s of snapshots) {
    if (!s.plaidAccountId) {
      continue;
    }
    latest.set(s.plaidAccountId, {
      creditLimit: s.creditLimit,
      current: s.currentBalance,
      snapshotDate: s.snapshotDate,
    });
  }
  return latest;
}

function applySnapshotBalance(
  account: BankAccountListItem,
  latest: ReturnType<typeof indexLatestSnapshotsByAccountId>,
): BankAccountListItem {
  const id = account.plaidAccountId;
  if (!id) {
    return account;
  }
  const snap = latest.get(id);
  if (!snap) {
    return account;
  }
  return {
    ...account,
    creditLimit: account.creditLimit ?? snap.creditLimit,
    current: snap.current,
    updatedAt: snap.snapshotDate,
  };
}

export const accountsRouter = createApp().openapi(listRoute, async (c) => {
  const userId = c.var.user.id;
  const [bank, credit, snapshots] = await Promise.all([
    getBankAccounts(userId),
    getCreditCards(userId),
    getBalanceSnapshotsByUserId(userId, {}),
  ]);
  const latest = indexLatestSnapshotsByAccountId(snapshots);
  const accounts = [...bank, ...credit].map((a) => applySnapshotBalance(a, latest));
  c.header("Cache-Control", "private, max-age=60");
  return c.json({ accounts }, 200);
});
