#!/usr/bin/env bun
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
/**
 * Force every active Plaid Item to fire a webhook by calling /transactions/sync
 * with no cursor. Plaid then sends SYNC_UPDATES_AVAILABLE → our prod webhook
 * handler runs plaidSyncWorkflow with the stored cursor → all
 * added/modified/removed transactions since the cursor flow into the DB.
 *
 * Use this after the webhook URL migration to backfill activity that landed
 * during the dead-webhook window. Skip if you'd rather wait for organic
 * webhook delivery (next time a bank posts new activity for the user).
 *
 * Cost: /transactions/sync is part of the standard Transactions subscription
 * and is NOT metered per-call. Verify in your Plaid Dashboard → Billing.
 *
 * Items without a stored cursor will trigger a full historical sync (up to
 * 24 months) — heavier load but same billing.
 *
 * Usage:
 *   bun run apps/server/scripts/trigger-plaid-sync-all.ts          # dry-run
 *   bun run apps/server/scripts/trigger-plaid-sync-all.ts --apply  # call Plaid
 *
 *   # Filter to a single Item (debugging):
 *   ITEM_ID=jNYp5OvR... bun run apps/server/scripts/trigger-plaid-sync-all.ts --apply
 */

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");
const { ITEM_ID } = process.env;
const { USER_ID } = process.env;
const CONCURRENCY = 5;
const DELAY_MS = 200;

const { db } = await import("@cobalt-web/db");
const { plaidConnection } = await import("@cobalt-web/db/schema/providers/plaid/connection");
const { plaidClient } = await import("@cobalt-web/clients/plaid");
const { eq, and, isNotNull, ne } = await import("drizzle-orm");

const baseWhere = and(
  isNotNull(plaidConnection.plaidAccessToken),
  ne(plaidConnection.plaidAccessToken, ""),
);
const filters = [baseWhere];
if (ITEM_ID) {
  filters.push(eq(plaidConnection.plaidItemId, ITEM_ID));
}
if (USER_ID) {
  filters.push(eq(plaidConnection.userId, USER_ID));
}
const where = and(...filters);

const rows = await db
  .select({
    accessToken: plaidConnection.plaidAccessToken,
    cursor: plaidConnection.transactionsCursor,
    id: plaidConnection.id,
    institutionName: plaidConnection.institutionName,
    itemId: plaidConnection.plaidItemId,
  })
  .from(plaidConnection)
  .where(where);

const mode = APPLY ? "(APPLY)" : "(dry-run)";
const itemFilter = ITEM_ID ? ` filtered to item=${ITEM_ID}` : "";
const userFilter = USER_ID ? ` filtered to user=${USER_ID}` : "";
console.log(`Will trigger sync for ${rows.length} Item(s) ${mode}${itemFilter}${userFilter}`);

const noCursor = rows.filter((r) => !r.cursor || r.cursor === "");
if (noCursor.length > 0) {
  console.log(
    `\n⚠ ${noCursor.length} Item(s) have no cursor — first sync will be FULL historical:`,
  );
  for (const r of noCursor) {
    console.log(`  ${r.itemId}  (${r.institutionName ?? "?"})`);
  }
}

if (!APPLY) {
  console.log("\nRe-run with --apply to call Plaid.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
const failures: { itemId: string; error: string }[] = [];

// Bounded concurrency. Plaid rate-limits per-client.
async function runOne(r: (typeof rows)[number]) {
  try {
    await plaidClient.transactionsSync({
      access_token: r.accessToken,
      count: 1,
      cursor: undefined,
    });
    console.log(`✓ ${r.itemId}  (${r.institutionName ?? "?"})`);
    ok += 1;
  } catch (error) {
    const msg =
      (
        error as {
          response?: { data?: { error_code?: string; error_message?: string } };
        }
      ).response?.data?.error_code ?? (error instanceof Error ? error.message : String(error));
    console.log(`✗ ${r.itemId}  (${r.institutionName ?? "?"})  ${msg}`);
    fail += 1;
    failures.push({ error: String(msg), itemId: r.itemId });
  }
}

const queue = [...rows];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length > 0) {
    const r = queue.shift();
    if (!r) {
      break;
    }
    await runOne(r);
    if (queue.length > 0) {
      await sleep(DELAY_MS);
    }
  }
});
await Promise.all(workers);

console.log(`\nDone. ok=${ok} fail=${fail}`);
if (failures.length > 0) {
  console.log("\nFailures by error code:");
  const byCode: Record<string, number> = {};
  for (const f of failures) {
    byCode[f.error] = (byCode[f.error] ?? 0) + 1;
  }
  for (const [code, n] of Object.entries(byCode).toSorted((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${n}`);
  }
}
process.exit(fail === 0 ? 0 : 1);
