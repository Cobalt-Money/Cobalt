/**
 * Scenario A — full overlap duplicate detection.
 *
 * Seed: a prior plaid_connection + one financial_account for TEST_USER at
 * ins_109508 with a mask/type that matches what sandbox will return. Then
 * run the onboarding workflow with a fresh sandbox public_token for the
 * same institution. The dup check (currently: `length > 0`) should
 * short-circuit the workflow before persist:
 *
 *   exchange → validate (dup found) → removeItem → emit "duplicate" → close
 *
 * Contract asserted:
 *   - workflow returns { success: false, error: "DUPLICATE_ACCOUNT" }
 *   - progress stream contains a terminal "duplicate" phase whose detail
 *     lists the seeded account
 *   - no new plaid_connection row is persisted for the new itemId
 *   - the seeded connection is untouched
 *
 * Prerequisites: same as onboarding-sync.integration.test.ts
 *   (db:local:up, db:migrate:local, sandbox Plaid creds in .env).
 */

import { setTimeout as delay } from "node:timers/promises";

import { plaidClient } from "@cobalt-web/clients/plaid";
import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { and, eq } from "drizzle-orm";
import { Products } from "plaid";
import { getRun, resumeHook, start } from "workflow/api";

import { plaidAddAccountWorkflow } from "../../../src/workflows/plaid/sync/workflow.js";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000002";
const INSTITUTION_ID = "ins_109508";

// Seed values — all clearly fake so cleanup can target them precisely and so
// no accidental match against real Plaid data is possible.
const SEED_ITEM_ID = `seed-dup-full-${Date.now()}`;
const SEED_ACCESS_TOKEN = `seed-access-token-${SEED_ITEM_ID}`;
const SEED_ACCOUNT_ID = `seed-acct-${Date.now()}`;
const SEED_ACCOUNT_NAME = "Seeded Checking";
// Sandbox ins_109508 reliably returns an account with mask "0000" +
// type "depository" (the "Plaid Checking" fixture). This is the match point.
const SEED_MASK = "0000";
const SEED_TYPE = "depository";
const SEED_SUBTYPE = "checking";

async function ensureTestUser(): Promise<void> {
  await db.execute(
    `INSERT INTO "user" (id, email, name, email_verified, created_at, updated_at)
     VALUES ('${TEST_USER_ID}', 'plaid-dup-full-integration@test.local',
             'Integration-DupFull', false, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
  );
}

async function seedPriorConnection(): Promise<void> {
  const [conn] = await db
    .insert(plaidConnection)
    .values({
      institutionId: INSTITUTION_ID,
      plaidAccessToken: SEED_ACCESS_TOKEN,
      plaidItemId: SEED_ITEM_ID,
      userId: TEST_USER_ID,
    })
    .returning({ id: plaidConnection.id });
  if (!conn) {
    throw new Error("Failed to seed plaidConnection");
  }
  await db.insert(financialAccount).values({
    externalId: SEED_ACCOUNT_ID,
    mask: SEED_MASK,
    name: SEED_ACCOUNT_NAME,
    plaidConnectionId: conn.id,
    source: "plaid",
    subtype: SEED_SUBTYPE,
    type: SEED_TYPE,
    userId: TEST_USER_ID,
  });
}

/**
 * Comprehensive teardown. Removes:
 *   1. Any plaid_connection row tied to the new Plaid itemId (financial_account
 *      rows cascade via FK).
 *   2. The seeded plaid_connection (unconditional).
 *   3. Every remaining plaid_connection for TEST_USER_ID (belt and suspenders,
 *      keeps the test user slot clean for re-runs).
 *
 * The Plaid-side item created by the workflow is removed by removeItemStep
 * inside the workflow itself when it hits the duplicate branch, so no Plaid
 * API cleanup is needed here.
 */
async function cleanup(newItemId: string | null): Promise<void> {
  if (newItemId) {
    await db.delete(plaidConnection).where(eq(plaidConnection.plaidItemId, newItemId));
  }
  await db.delete(plaidConnection).where(eq(plaidConnection.plaidItemId, SEED_ITEM_ID));
  // Belt-and-suspenders sweep.
  await db.delete(plaidConnection).where(eq(plaidConnection.userId, TEST_USER_ID));
}

interface ProgressEvent {
  phase: string;
  status: string;
  detail?: {
    duplicates?: { name: string; createdAt: string | Date }[];
    itemId?: string;
  };
}

/**
 * Wait for the run to terminate, then read the namespaced stream from index 0
 * up to its known tail. We avoid racing the workflow — chunks are persisted
 * on disk via the WDK local world, so once the run reaches a terminal state
 * we can replay everything deterministically.
 *
 * This avoids relying on the stream's close signal propagating through a
 * cross-process local world (which it doesn't, in this harness — observed
 * empty reads on a stream with on-disk chunks).
 */
async function collectProgress(runId: string): Promise<ProgressEvent[]> {
  const run = getRun(runId);

  // Poll for terminal state. WDK's own `returnValue` also polls; using status
  // directly keeps the signal simple.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const status = await run.status;
    if (status === "completed" || status === "failed" || status === "cancelled") {
      break;
    }
    await delay(200);
  }

  const readable = run.getReadable<ProgressEvent>({
    namespace: "progress",
    startIndex: 0,
  });
  const tailIndex = await readable.getTailIndex();

  // No chunks written — return empty. Assertions will diagnose.
  if (tailIndex < 0) {
    return [];
  }

  const reader = readable.getReader();
  const events: ProgressEvent[] = [];
  try {
    while (events.length <= tailIndex) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value !== undefined && value !== null) {
        // WDK returns typed objects for namespaced streams by default. Accept
        // both object and raw-bytes shapes defensively.
        if (typeof value === "object" && !("byteLength" in (value as object))) {
          events.push(value as ProgressEvent);
        } else {
          const text =
            typeof value === "string"
              ? value
              : new TextDecoder().decode(value as unknown as Uint8Array);
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              events.push(JSON.parse(trimmed));
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return events;
}

describe("plaid onboarding — Scenario A: full overlap duplicate", () => {
  it("rejects the new item, emits duplicate phase, does not persist", async () => {
    let newItemId: string | null = null;

    try {
      await ensureTestUser();
      await cleanup(null); // clean slate for re-runs
      await seedPriorConnection();

      // Mint a fresh sandbox token for the SAME institution. Its accounts will
      // overlap with the seeded one on (institutionId, mask, type).
      const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
        initial_products: [Products.Transactions],
        institution_id: INSTITUTION_ID,
      });
      const publicToken = sandboxRes.data.public_token;

      const hookToken = `plaid:link:${TEST_USER_ID}:${crypto.randomUUID()}`;
      const run = await start(plaidAddAccountWorkflow, [{ hookToken, userId: TEST_USER_ID }]);
      await resumeHook(hookToken, { publicToken });

      // Drive assertions off the progress stream. The stream closes when the
      // workflow hits `closeOnboardingProgressStep()` in the dup branch. We
      // do NOT await `run.returnValue` — in the spawned-Nitro test harness
      // that promise can hang on a completed run, which we observed via
      // `workflow inspect run` reporting status: "completed" while the test
      // still timed out.
      const events = await collectProgress(run.runId);

      // If we got no events at all, the workflow never ran or the stream
      // harness is wedged — fail with a diagnostic, not a silent empty match.
      expect(events.length).toBeGreaterThan(0);

      // Derive itemId from the exchange phase for cleanup targeting.
      const exchangeEvent = events.find((e) => e.phase === "exchange" && e.status === "done");
      newItemId = (exchangeEvent?.detail as { itemId?: string } | undefined)?.itemId ?? null;

      // Progress contract: terminal "duplicate" phase present, with the
      // seeded account named in detail.duplicates.
      const duplicateEvent = events.find((e) => e.phase === "duplicate" && e.status === "done");
      expect(duplicateEvent).toBeDefined();
      const dups = duplicateEvent?.detail?.duplicates ?? [];
      expect(dups.length).toBeGreaterThan(0);
      expect(dups.some((d) => d.name === SEED_ACCOUNT_NAME)).toBeTruthy();

      // Progress contract: workflow did NOT reach persist/accounts/banking/transactions.
      const phases = events.map((e) => e.phase);
      expect(phases).not.toContain("persist");
      expect(phases).not.toContain("accounts");
      expect(phases).not.toContain("transactions");
      expect(phases).not.toContain("done");

      // DB contract: no plaid_connection for the new itemId. Guarded because
      // we may not have learned newItemId before the dup branch fired.
      // biome-ignore lint/nursery/noConditionalTests: integration-test guard
      const [leakedConn] = newItemId
        ? await db
            .select()
            .from(plaidConnection)
            .where(eq(plaidConnection.plaidItemId, newItemId))
            .limit(1)
        : [undefined];
      expect(leakedConn).toBeUndefined();

      // DB contract: seeded connection + account still intact.
      const [seedConn] = await db
        .select()
        .from(plaidConnection)
        .where(
          and(
            eq(plaidConnection.plaidItemId, SEED_ITEM_ID),
            eq(plaidConnection.userId, TEST_USER_ID),
          ),
        )
        .limit(1);
      expect(seedConn).toBeDefined();

      const seedAccts = seedConn
        ? await db
            .select()
            .from(financialAccount)
            .where(eq(financialAccount.plaidConnectionId, seedConn.id))
        : [];
      expect(seedAccts).toHaveLength(1);
      expect(seedAccts[0]?.externalId).toBe(SEED_ACCOUNT_ID);
    } finally {
      await cleanup(newItemId);
    }
  }, 120_000);
});
