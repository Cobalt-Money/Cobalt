#!/usr/bin/env bun
/**
 * SRI-353 — backfill `pfc_primary` + `pfc_detailed` on existing Plaid txns
 * by re-pulling each Item via `/transactions/sync` from an empty cursor.
 *
 * Free under Plaid's subscription billing (one-time fee model for Transactions
 * — re-syncs already-billed Items don't incur per-call charges; only
 * /transactions/refresh would be billable).
 *
 * Usage:
 *   bun run apps/server/scripts/backfill-plaid-pfc.ts                # dry-run all items
 *   USER_ID=xxx bun run apps/server/scripts/backfill-plaid-pfc.ts    # dry-run one user
 *   ITEM_ID=xxx bun run apps/server/scripts/backfill-plaid-pfc.ts    # dry-run one item
 *   bun run apps/server/scripts/backfill-plaid-pfc.ts --apply        # actually re-sync
 */

import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");
const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? 5);
const { USER_ID, ITEM_ID } = process.env;

const { db } = await import("@cobalt-web/db");
const { plaidConnection } = await import("@cobalt-web/db/schema/providers/plaid/connection");
const { transaction } =
  await import("@cobalt-web/db/schema/accounts/banking/transactions/transaction");
const { financialAccount } = await import("@cobalt-web/db/schema/accounts/account");
const { syncTransactionsPage } =
  await import("@cobalt-web/server-data/providers/plaid/transactions/actions");
const {
  persistTransactions,
  removeTransactionsByIds,
  setTransactionsCursor,
  applyPendingOverrides,
} = await import("@cobalt-web/server-data/providers/plaid/transactions/mutations");
const { getUserOverrides } =
  await import("@cobalt-web/server-data/providers/plaid/transactions/queries");
const { and, eq, isNotNull, ne, sql } = await import("drizzle-orm");
const pLimitModule = await import("p-limit");
const pLimit = pLimitModule.default;

const filters = [
  isNotNull(plaidConnection.plaidAccessToken),
  ne(plaidConnection.plaidAccessToken, ""),
];
if (ITEM_ID) {
  filters.push(eq(plaidConnection.plaidItemId, ITEM_ID));
}
if (USER_ID) {
  filters.push(eq(plaidConnection.userId, USER_ID));
}

const items = await db
  .select({
    accessToken: plaidConnection.plaidAccessToken,
    institutionName: plaidConnection.institutionName,
    itemId: plaidConnection.plaidItemId,
    userId: plaidConnection.userId,
  })
  .from(plaidConnection)
  .where(and(...filters));

// Per-item pre-count of NULL-PFC txns so dry-run shows real impact, not just item count.
const counts = await db
  .select({
    itemId: plaidConnection.plaidItemId,
    nullCount: sql<number>`COUNT(*) FILTER (WHERE ${transaction.pfcPrimary} IS NULL)::int`,
    totalCount: sql<number>`COUNT(*)::int`,
  })
  .from(plaidConnection)
  .innerJoin(financialAccount, eq(financialAccount.plaidConnectionId, plaidConnection.id))
  .innerJoin(transaction, eq(transaction.accountId, financialAccount.id))
  .where(
    and(
      eq(transaction.source, "plaid"),
      ITEM_ID ? eq(plaidConnection.plaidItemId, ITEM_ID) : sql`true`,
    ),
  )
  .groupBy(plaidConnection.plaidItemId);

const countByItem = new Map(counts.map((c) => [c.itemId, c]));

console.log(`Items eligible: ${items.length}  (mode=${APPLY ? "APPLY" : "DRY-RUN"})`);
for (const item of items) {
  const c = countByItem.get(item.itemId);
  console.log(
    `  ${item.itemId}  ${(item.institutionName ?? "?").padEnd(20)}  null=${c?.nullCount ?? 0}/${c?.totalCount ?? 0}`,
  );
}

if (items.length === 0) {
  process.exit(0);
}
if (!APPLY) {
  console.log("\nRe-run with --apply to backfill via /transactions/sync.");
  process.exit(0);
}

const limit = pLimit(CONCURRENCY);
let totalPages = 0;
let totalUpserted = 0;
let totalRemoved = 0;
let failed = 0;
const start = Date.now();

async function backfillOne(item: (typeof items)[number]) {
  let cursor: string | undefined;
  let hasMore = true;
  let pages = 0;
  let upserted = 0;
  let removed = 0;
  const pendingOverrides = new Map<
    string,
    Awaited<ReturnType<typeof getUserOverrides>> extends Map<infer _K, infer V> ? V : never
  >();

  while (hasMore) {
    const page = await syncTransactionsPage(item.accessToken, cursor, 500);
    pages += 1;

    await persistTransactions([...page.added, ...page.modified]);
    upserted += page.added.length + page.modified.length;

    if (page.removed.length > 0) {
      const removedIds = page.removed.map((tx) => tx.transaction_id);
      const overrides = await getUserOverrides(removedIds);
      for (const [id, override] of overrides) {
        pendingOverrides.set(id, override);
      }
      await removeTransactionsByIds(removedIds);
      removed += removedIds.length;
    }

    ({ hasMore, nextCursor: cursor } = page);
    await setTransactionsCursor(item.itemId, cursor);
  }

  if (pendingOverrides.size > 0) {
    await applyPendingOverrides(pendingOverrides);
  }

  return { pages, removed, upserted };
}

const results = await Promise.all(
  items.map((item) =>
    limit(async () => {
      try {
        const r = await backfillOne(item);
        totalPages += r.pages;
        totalUpserted += r.upserted;
        totalRemoved += r.removed;
        console.log(
          `✓ ${item.itemId}  pages=${r.pages}  upserted=${r.upserted}  removed=${r.removed}`,
        );
        return { item, ...r, ok: true as const };
      } catch (error) {
        failed += 1;
        const msg =
          (error as { response?: { data?: { error_code?: string } } }).response?.data?.error_code ??
          (error instanceof Error ? error.message : String(error));
        console.log(`✗ ${item.itemId}  (${item.institutionName ?? "?"})  ${msg}`);
        return { error: msg, item, ok: false as const };
      }
    }),
  ),
);

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(
  `\nDone in ${elapsed}s. items=${items.length}  ok=${results.filter((r) => r.ok).length}  fail=${failed}  pages=${totalPages}  upserted=${totalUpserted}  removed=${totalRemoved}`,
);

const verify = await db
  .select({
    nullCount: sql<number>`COUNT(*) FILTER (WHERE ${transaction.pfcPrimary} IS NULL)::int`,
    totalCount: sql<number>`COUNT(*)::int`,
  })
  .from(transaction)
  .where(eq(transaction.source, "plaid"));
const [v] = verify;
if (v) {
  console.log(
    `Coverage: pfc_primary set on ${v.totalCount - v.nullCount} / ${v.totalCount} plaid txns`,
  );
}

process.exit(failed === 0 ? 0 : 1);
