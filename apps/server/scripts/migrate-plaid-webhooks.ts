#!/usr/bin/env bun
import { resolve } from "node:path";
/**
 * One-shot: repoint every existing Plaid Item to a new webhook URL.
 *
 * Plaid binds the webhook URL per-Item at link-token creation. Changing
 * `PLAID_WEBHOOK_URL` in the server env only affects NEW links — existing
 * Items in the DB keep whatever URL they had at link time. Run this script
 * after deploying a server with a new webhook URL to repoint every Item.
 *
 * Usage:
 *   bun run scripts/migrate-plaid-webhooks.ts           # dry-run, prints plan
 *   bun run scripts/migrate-plaid-webhooks.ts --apply   # call Plaid + write DB
 *
 * Env (loaded from apps/server/.env):
 *   PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
 *   PLAID_WEBHOOK_URL (target URL — same one the server now reads)
 *   DATABASE_URL or MIGRATION_URI
 */

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");

const targetUrl = process.env.PLAID_WEBHOOK_URL;
if (!targetUrl) {
  console.error("PLAID_WEBHOOK_URL not set in apps/server/.env");
  process.exit(1);
}

const { plaidClient } = await import("@cobalt-web/clients/plaid");
const { db } = await import("@cobalt-web/db");
const { plaidConnection } =
  await import("@cobalt-web/db/schema/providers/plaid/connection");
const { eq, ne, isNull, or } = await import("drizzle-orm");

// Pull every connection whose stored webhook URL doesn't match the target.
// `or(isNull, ne)` covers both "never set" and "set to old URL".
const rows = await db
  .select({
    accessToken: plaidConnection.plaidAccessToken,
    id: plaidConnection.id,
    itemId: plaidConnection.plaidItemId,
    webhookUrl: plaidConnection.webhookUrl,
  })
  .from(plaidConnection)
  .where(
    or(
      isNull(plaidConnection.webhookUrl),
      ne(plaidConnection.webhookUrl, targetUrl)
    )
  );

console.log(
  `Found ${rows.length} Plaid Items to repoint → ${targetUrl} ${APPLY ? "(APPLY)" : "(dry-run)"}`
);
for (const r of rows) {
  console.log(`  ${r.itemId}  current=${r.webhookUrl ?? "(null)"}`);
}

if (!APPLY) {
  console.log("\nRe-run with --apply to perform the update.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const r of rows) {
  try {
    await plaidClient.itemWebhookUpdate({
      access_token: r.accessToken,
      webhook: targetUrl,
    });
    await db
      .update(plaidConnection)
      .set({ webhookUrl: targetUrl })
      .where(eq(plaidConnection.id, r.id));
    console.log(`✓ ${r.itemId}`);
    ok += 1;
  } catch (error) {
    console.error(
      `✗ ${r.itemId}`,
      error instanceof Error ? error.message : error
    );
    fail += 1;
  }
}

console.log(`\nDone. ok=${ok} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
