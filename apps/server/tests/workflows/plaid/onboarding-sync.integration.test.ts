/**
 * End-to-end integration test for the Plaid onboarding streaming flow.
 *
 * Covers the bridge between:
 *   1. `/plaid/items/persist` starting `plaidInitialSyncWorkflow` and the
 *      workflow suspending on its deterministic onboarding hook
 *   2. The webhook handler routing `SYNC_UPDATES_AVAILABLE` to `resumeHook`
 *      when a waiting hook exists
 *   3. Subsequent sync steps running, emitting progress, and completing the
 *      run (return value + closed stream)
 *
 * Strategy: skip the browser-side Link flow by minting a sandbox public token
 * via Plaid's `/sandbox/public_token/create`, exchange it for an access token,
 * persist a test-user-owned plaid_connection row, then start the workflow and
 * POST our own webhook endpoint directly — no ngrok required, since both the
 * workflow and the "delivered" webhook hit the same spawned Nitro.
 *
 * Prerequisites:
 *   1. `bun run db:local:up` — docker Postgres on port 5433
 *   2. `bun run db:migrate:local` — apply schema
 *   3. Real `PLAID_CLIENT_ID` + `PLAID_SECRET` (sandbox creds) in apps/server/.env
 *      — the spawned Nitro reads them, and this test calls Plaid directly too.
 *   4. `PLAID_ENV=sandbox` (the default)
 */

import { setTimeout as delay } from "node:timers/promises";

import { plaidClient } from "@cobalt-web/clients/plaid";
import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { eq } from "drizzle-orm";
import { Products } from "plaid";
import { getRun, resumeHook, start } from "workflow/api";

import { plaidAddAccountWorkflow } from "../../../src/workflows/plaid/sync/workflow.js";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
const WEBHOOK_URL = "http://localhost:4000/api/plaid/webhook";

async function ensureTestUser(): Promise<void> {
  // The plaid_connection FK requires a user row. We don't care about auth for
  // this test — just enough structural integrity to satisfy the constraint.
  // Using a minimal raw insert via Drizzle; on conflict do nothing so re-runs
  // don't fight each other.
  await db.execute(
    `INSERT INTO "user" (id, email, name, email_verified, created_at, updated_at)
     VALUES ('${TEST_USER_ID}', 'plaid-onboarding-integration@test.local',
             'Integration', false, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
  );
}

async function cleanupItem(itemId: string): Promise<void> {
  if (!itemId) {
    return;
  }
  // financial_account rows cascade via plaid_connection FK.
  await db.delete(plaidConnection).where(eq(plaidConnection.plaidItemId, itemId));
}

/**
 * Poll plaid_connection until the onboarding workflow's persist step has run
 * for this user. Bounded retry so a failing workflow doesn't hang the test.
 */
async function waitForPersist(userId: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const [row] = await db
      .select({ plaidItemId: plaidConnection.plaidItemId })
      .from(plaidConnection)
      .where(eq(plaidConnection.userId, userId))
      .limit(1);
    if (row?.plaidItemId) {
      return row.plaidItemId;
    }
    await delay(200);
  }
  throw new Error("Timed out waiting for plaid_connection to be persisted");
}

async function collectProgress(runId: string): Promise<{ phase: string; status: string }[]> {
  const run = getRun(runId);
  const readable = run.getReadable({ namespace: "progress" });
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  const events: { phase: string; status: string }[] = [];
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += typeof value === "string" ? value : decoder.decode(value);
    let nl = buffer.indexOf("\n");
    while (nl !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.length > 0) {
        events.push(JSON.parse(line));
      }
      nl = buffer.indexOf("\n");
    }
  }
  return events;
}

describe("plaid onboarding streaming (server-based integration)", () => {
  it("bridges /link-complete → webhook → streamed progress → completed run", async () => {
    await ensureTestUser();

    // 1. Mint a sandbox public token WITHOUT going through Link.
    const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
      initial_products: [Products.Transactions],
      institution_id: "ins_109508", // "First Platypus Bank" — clean sandbox path
    });
    const publicToken = sandboxRes.data.public_token;

    // The workflow itself exchanges the public_token, so we only know the
    // itemId after starting. Capture it via the workflow's return value.
    let itemId = "";

    try {
      // 2. Start the add-account workflow with a hook token, then resume it
      // with the sandbox public token — mirrors the /createLinkToken +
      // /resolveLink handoff the real client does.
      const hookToken = `plaid:link:${TEST_USER_ID}:${crypto.randomUUID()}`;
      const run = await start(plaidAddAccountWorkflow, [{ hookToken, userId: TEST_USER_ID }]);
      await resumeHook(hookToken, { publicToken });

      // 3. Collect progress stream in parallel. Resolves when stream closes.
      const progressPromise = collectProgress(run.runId);

      // 4. Wait for the workflow to exchange + persist before we can look up
      // the itemId to target the webhook. Poll plaid_connection until the row
      // appears or we hit a bounded retry window.
      const persistedItemId = await waitForPersist(TEST_USER_ID);
      itemId = persistedItemId;

      // 5. POST our own webhook endpoint to simulate SYNC_UPDATES_AVAILABLE.
      const webhookRes = await fetch(WEBHOOK_URL, {
        body: JSON.stringify({
          environment: "sandbox",
          historical_update_complete: true,
          initial_update_complete: true,
          item_id: itemId,
          webhook_code: "SYNC_UPDATES_AVAILABLE",
          webhook_type: "TRANSACTIONS",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      expect(webhookRes.status).toBe(200);

      // 6. Await workflow completion and the stream close.
      const result = await run.returnValue;
      const events = await progressPromise;

      // Contract: the workflow finishes successfully end-to-end.
      expect(result).toMatchObject({ itemId, success: true });

      // Contract: the observable phase order the UI depends on.
      const phases = events.map((e) => e.phase);
      expect(phases[0]).toBe("exchange");
      expect(phases).toContain("validate");
      expect(phases).toContain("persist");
      expect(phases).toContain("waiting_for_plaid");
      expect(phases).toContain("accounts");
      expect(phases).toContain("transactions");
      expect(phases.at(-1)).toBe("done");

      // Contract: the sync actually wrote data. Plaid's First Platypus sandbox
      // reliably returns at least one account.
      const [conn] = await db
        .select({ id: plaidConnection.id })
        .from(plaidConnection)
        .where(eq(plaidConnection.plaidItemId, itemId))
        .limit(1);
      const accounts = conn
        ? await db
            .select()
            .from(financialAccount)
            .where(eq(financialAccount.plaidConnectionId, conn.id))
        : [];
      expect(accounts.length).toBeGreaterThan(0);
    } finally {
      await cleanupItem(itemId);
    }
  }, 120_000);
});
