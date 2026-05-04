#!/usr/bin/env bun
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
/**
 * Self-POST a synthetic SYNC_UPDATES_AVAILABLE webhook to our own endpoint
 * per Item. Used when Plaid already notified us about pending data during a
 * dead-webhook window — Plaid won't re-fire those notifications, but the
 * data is still queued at the cursor on Plaid's side.
 *
 * Calls the SAME handler that real Plaid webhooks hit → plaidSyncWorkflow →
 * cursor-based drain → DB upsert. Free (no Plaid API calls).
 *
 * Usage:
 *   USER_ID=xxx bun run apps/server/scripts/self-trigger-plaid-sync.ts
 *   USER_ID=xxx bun run apps/server/scripts/self-trigger-plaid-sync.ts --apply
 */

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const { USER_ID } = process.env;
const { ITEM_ID } = process.env;
const ENDPOINT = process.env.WEBHOOK_ENDPOINT ?? "https://api.cobaltpf.com/webhooks/plaid";

if (!USER_ID && !ITEM_ID && !ALL) {
  console.error("Set USER_ID, ITEM_ID, or --all. Refuse to fan out implicitly.");
  process.exit(1);
}

const { db } = await import("@cobalt-web/db");
const { plaidConnection } = await import("@cobalt-web/db/schema/providers/plaid/connection");
const { eq, and } = await import("drizzle-orm");

const filters = [];
if (ITEM_ID) {
  filters.push(eq(plaidConnection.plaidItemId, ITEM_ID));
}
if (USER_ID) {
  filters.push(eq(plaidConnection.userId, USER_ID));
}

const rows = await db
  .select({
    institutionName: plaidConnection.institutionName,
    itemId: plaidConnection.plaidItemId,
  })
  .from(plaidConnection)
  .where(and(...filters));

console.log(
  `Will POST synthetic SYNC_UPDATES_AVAILABLE to ${ENDPOINT} for ${rows.length} Item(s) ${APPLY ? "(APPLY)" : "(dry-run)"}`,
);
for (const r of rows) {
  console.log(`  ${r.itemId}  (${r.institutionName ?? "?"})`);
}

if (!APPLY) {
  console.log("\nRe-run with --apply to fire.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const r of rows) {
  const body = {
    environment: "production",
    historical_update_complete: true,
    initial_update_complete: true,
    item_id: r.itemId,
    webhook_code: "SYNC_UPDATES_AVAILABLE",
    webhook_type: "TRANSACTIONS",
  };
  try {
    const res = await fetch(ENDPOINT, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (res.ok) {
      console.log(`✓ ${r.itemId}  (${r.institutionName ?? "?"})  → ${res.status}`);
      ok += 1;
    } else {
      const text = await res.text();
      console.log(
        `✗ ${r.itemId}  (${r.institutionName ?? "?"})  → ${res.status} ${text.slice(0, 80)}`,
      );
      fail += 1;
    }
  } catch (error) {
    console.log(
      `✗ ${r.itemId}  (${r.institutionName ?? "?"})  ${error instanceof Error ? error.message : error}`,
    );
    fail += 1;
  }
  // Small delay so workflows don't all hammer the DB at once.
  await sleep(300);
}

console.log(`\nDone. ok=${ok} fail=${fail}. Workflows now running async — verify DB in ~1-2 min.`);
process.exit(fail === 0 ? 0 : 1);
