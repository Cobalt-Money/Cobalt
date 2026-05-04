#!/usr/bin/env bun
import { resolve } from "node:path";
/**
 * Call Plaid /transactions/refresh per Item. This is a PAID add-on
 * (per-call billing). Plaid then crawls the institution fresh and fires
 * SYNC_UPDATES_AVAILABLE → our prod webhook handler runs plaidSyncWorkflow.
 *
 * Use sparingly. Default behavior: USER_ID required, no all-users path.
 *
 * Usage:
 *   USER_ID=xxx bun run apps/server/scripts/refresh-plaid-transactions.ts
 *   USER_ID=xxx bun run apps/server/scripts/refresh-plaid-transactions.ts --apply
 *   ITEM_ID=xxx bun run apps/server/scripts/refresh-plaid-transactions.ts --apply
 */

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");
const { USER_ID } = process.env;
const { ITEM_ID } = process.env;

if (!USER_ID && !ITEM_ID) {
  console.error("Refuse to refresh all Items (paid per-call). Set USER_ID or ITEM_ID.");
  process.exit(1);
}

const { db } = await import("@cobalt-web/db");
const { plaidConnection } = await import("@cobalt-web/db/schema/providers/plaid/connection");
const { plaidClient } = await import("@cobalt-web/clients/plaid");
const { eq, and, isNotNull, ne } = await import("drizzle-orm");

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

const rows = await db
  .select({
    accessToken: plaidConnection.plaidAccessToken,
    institutionName: plaidConnection.institutionName,
    itemId: plaidConnection.plaidItemId,
  })
  .from(plaidConnection)
  .where(and(...filters));

console.log(
  `Will call /transactions/refresh on ${rows.length} Item(s) ${APPLY ? "(APPLY — billable)" : "(dry-run)"}`,
);
for (const r of rows) {
  console.log(`  ${r.itemId}  (${r.institutionName ?? "?"})`);
}

if (rows.length === 0) {
  process.exit(0);
}

if (!APPLY) {
  console.log("\nRe-run with --apply to call Plaid. Each call is billable per your contract.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const r of rows) {
  try {
    await plaidClient.transactionsRefresh({ access_token: r.accessToken });
    console.log(`✓ ${r.itemId}  (${r.institutionName ?? "?"})  refresh requested`);
    ok += 1;
  } catch (error) {
    const code =
      (error as { response?: { data?: { error_code?: string } } }).response?.data?.error_code ??
      (error instanceof Error ? error.message : String(error));
    console.log(`✗ ${r.itemId}  (${r.institutionName ?? "?"})  ${code}`);
    fail += 1;
  }
}

console.log(
  `\nDone. ok=${ok} fail=${fail}. Watch server logs for SYNC_UPDATES_AVAILABLE webhooks (typically 10–60s).`,
);
process.exit(fail === 0 ? 0 : 1);
