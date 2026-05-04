#!/usr/bin/env bun
import { resolve } from "node:path";
/**
 * Pre-flight for migrate-plaid-webhooks.ts. Verifies:
 *   1. Required env vars present
 *   2. DB connects + row count looks reasonable
 *   3. Plaid creds work (calls itemGet on one Item — also proves the
 *      access_token belongs to this Plaid environment)
 *   4. New webhook URL is reachable + handler returns expected guard
 *
 * Read-only. Safe to run any time.
 */

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) {
    fail += 1;
  }
}

// 1. env vars
const required = [
  "PLAID_CLIENT_ID",
  "PLAID_CLIENT_SECRET",
  "PLAID_ENV",
  "PLAID_WEBHOOK_URL",
] as const;
for (const k of required) {
  check(
    `env ${k}`,
    Boolean(process.env[k]),
    process.env[k] ? "set" : "MISSING"
  );
}
const dbUrl = process.env.MIGRATION_URI ?? process.env.DATABASE_URL;
check("env DATABASE_URL or MIGRATION_URI", Boolean(dbUrl));

const targetUrl = process.env.PLAID_WEBHOOK_URL;
const plaidEnv = process.env.PLAID_ENV;
console.log(`\n  PLAID_ENV         = ${plaidEnv}`);
console.log(`  PLAID_WEBHOOK_URL = ${targetUrl}`);
console.log(
  `  DB host           = ${dbUrl ? new URL(dbUrl).host : "(unset)"}\n`
);

if (fail > 0) {
  console.error("Stopping: fix env first.");
  process.exit(1);
}

// 2. DB
const { db } = await import("@cobalt-web/db");
const { plaidConnection } =
  await import("@cobalt-web/db/schema/providers/plaid/connection");
const { ne, isNull, or, sql } = await import("drizzle-orm");

let totalCount = 0;
let staleCount = 0;
let firstStale: { itemId: string; accessToken: string } | undefined;
try {
  const totalRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(plaidConnection);
  totalCount = totalRows[0]?.c ?? 0;
  check("DB connects + plaidConnection readable", true, `total=${totalCount}`);

  const staleRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(plaidConnection)
    .where(
      or(
        isNull(plaidConnection.webhookUrl),
        ne(plaidConnection.webhookUrl, targetUrl ?? "")
      )
    );
  staleCount = staleRows[0]?.c ?? 0;
  check(
    "rows whose webhookUrl ≠ target",
    staleCount >= 0,
    `${staleCount} need repointing`
  );

  const sample = await db
    .select({
      accessToken: plaidConnection.plaidAccessToken,
      itemId: plaidConnection.plaidItemId,
    })
    .from(plaidConnection)
    .limit(1);
  const [first] = sample;
  if (first) {
    firstStale = first;
  }
} catch (error) {
  check(
    "DB connects",
    false,
    error instanceof Error ? error.message : String(error)
  );
}

// 3. Plaid creds + per-Item validity (using one row's access token)
try {
  const { plaidClient } = await import("@cobalt-web/clients/plaid");
  if (firstStale) {
    const r = await plaidClient.itemGet({
      access_token: firstStale.accessToken,
    });
    const currentWebhook = r.data.item.webhook ?? "(none)";
    check(
      "Plaid creds valid (itemGet on sample Item)",
      true,
      `Item ${firstStale.itemId} currently → ${currentWebhook}`
    );
    if (currentWebhook === targetUrl) {
      console.log(
        "  note: this sample already points to target. Other rows may still be stale."
      );
    }
  } else {
    check("Plaid creds (no rows to test against)", false, "skipped");
  }
} catch (error) {
  check(
    "Plaid creds valid",
    false,
    error instanceof Error ? error.message : String(error)
  );
}

// 4. Webhook endpoint reachable
if (targetUrl) {
  try {
    const res = await fetch(targetUrl, {
      body: "{}",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    // Handler is live if it answers anything other than 404 / 5xx. Plaid
    // contract says return 200 for unrecognized webhook codes to suppress
    // retries, so 2xx and 4xx both count as "router is mounted".
    const ok = res.status !== 404 && res.status < 500;
    check(
      "webhook endpoint reachable (handler mounted)",
      ok,
      `status=${res.status}`
    );
  } catch (error) {
    check(
      "webhook endpoint reachable",
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

console.log(
  `\nResult: ${fail === 0 ? "READY — safe to run --apply" : `${fail} failure(s) — fix before applying`}`
);
process.exit(fail === 0 ? 0 : 1);
