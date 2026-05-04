#!/usr/bin/env bun
import { resolve } from "node:path";
/**
 * Delete seed/demo Plaid connections that aren't real Items.
 * Their access tokens are placeholders — Plaid 400s on every API call to them.
 *
 * Cascades: account.plaid_connection_id has onDelete=cascade, so dependent
 * accounts (and anything FK'd to those accounts) drop with the connection.
 *
 * Default = dry-run. Pass --apply to actually delete.
 */

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");

const { db } = await import("@cobalt-web/db");
const { plaidConnection } =
  await import("@cobalt-web/db/schema/providers/plaid/connection");
const { financialAccount } =
  await import("@cobalt-web/db/schema/accounts/account");
const { inArray, like, or, sql } = await import("drizzle-orm");

// Match seed-pattern item IDs.
const matchPredicate = or(
  like(plaidConnection.plaidItemId, "demo-item-%"),
  like(plaidConnection.plaidItemId, "rv-item-%")
);

const rows = await db
  .select({
    id: plaidConnection.id,
    itemId: plaidConnection.plaidItemId,
    webhookUrl: plaidConnection.webhookUrl,
  })
  .from(plaidConnection)
  .where(matchPredicate);

console.log(`Matched ${rows.length} seed plaidConnection rows:`);
for (const r of rows) {
  console.log(`  ${r.itemId}  webhook=${r.webhookUrl ?? "(null)"}`);
}

if (rows.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

const ids = rows.map((r) => r.id);
const acctRows = await db
  .select({ c: sql<number>`count(*)::int` })
  .from(financialAccount)
  .where(inArray(financialAccount.plaidConnectionId, ids));
const cascadeAccountCount = acctRows[0]?.c ?? 0;

console.log(
  `\nCascade impact: ${cascadeAccountCount} account row(s) will be deleted via FK cascade`
);
console.log(
  "(further cascades may follow: transactions, balances, snapshots, etc.)"
);

if (!APPLY) {
  console.log("\nDry-run. Re-run with --apply to delete.");
  process.exit(0);
}

const deleted = await db
  .delete(plaidConnection)
  .where(matchPredicate)
  .returning({ id: plaidConnection.id, itemId: plaidConnection.plaidItemId });

console.log(`\nDeleted ${deleted.length} plaidConnection row(s).`);
for (const d of deleted) {
  console.log(`  ✓ ${d.itemId}`);
}
process.exit(0);
