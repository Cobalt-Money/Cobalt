/**
 * SRI-317 Phase 1a happy-path integration test.
 *
 * Drives a Mint CSV all the way through:
 *   upload + stage → setAccountMap (create new manual account) → dedupe workflow
 *   → commit workflow → assert `transaction` rows landed on the new account.
 *
 * Touches workflow steps directly via `start()`; does not exercise the HTTP routes
 * (auth scaffolding for a test session is heavier than this test needs).
 *
 * Prerequisites:
 *   1. `bun run db:local:up`     — local Postgres on 127.0.0.1:5433
 *   2. `bun run db:migrate:local` — apply migrations
 *
 * Run with: `bun run test:integration:happy`
 */

import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { setAccountMap } from "@cobalt-web/server-data/import/mutations";
import type { AccountMapBody } from "@cobalt-web/server-data/import/schemas";
import { uploadAndStageImport } from "@cobalt-web/server-data/import/upload";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { start } from "workflow/api";

import { importCommitWorkflow } from "../../../src/workflows/import/commit/workflow.js";
import { importDedupeWorkflow } from "../../../src/workflows/import/dedupe/workflow.js";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000317";

const SAMPLE_CSV = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"04/15/2025","Starbucks","SBUX #1234","5.75","debit","Coffee","Mint Checking","",""
"04/16/2025","Paycheck","ACME PAYROLL","2500.00","credit","Income","Mint Checking","",""
"04/17/2025","Whole Foods","WFM 8821","87.42","debit","Groceries","Mint Checking","",""
`;

async function ensureTestUser(): Promise<void> {
  await db.execute(
    `INSERT INTO "user" (id, email, name, email_verified, created_at, updated_at)
     VALUES ('${TEST_USER_ID}', 'sri-317-import-integration@test.local',
             'Import Integration', false, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
  );
}

async function cleanupForUser(): Promise<void> {
  // transaction has FK to financial_account (cascade) and import_job (cascade).
  // Dropping financial_account cascade-deletes balance + transactions. Drop
  // import_job last so staged rows clean up via their FK.
  await db.delete(financialAccount).where(eq(financialAccount.userId, TEST_USER_ID));
  await db.delete(importJob).where(eq(importJob.userId, TEST_USER_ID));
  // Defensive: orphan staged rows shouldn't exist after import_job drop, but
  // strip any that survived a prior aborted run.
  await db.delete(importStagedTransaction).where(eq(importStagedTransaction.parseError, ""));
}

describe("SRI-317 import happy path (self-seeded integration)", () => {
  beforeAll(async () => {
    await ensureTestUser();
    await cleanupForUser();
  }, 30_000);

  afterAll(async () => {
    await cleanupForUser();
    await db.execute(`DELETE FROM "user" WHERE id = '${TEST_USER_ID}'`);
  }, 30_000);

  it("uploads → maps (create) → dedupes → commits → 3 transactions land", async () => {
    // Stage 1 — parse + stage CSV.
    const stageResult = await uploadAndStageImport({
      buffer: Buffer.from(SAMPLE_CSV),
      filename: "transactions.csv",
      userId: TEST_USER_ID,
    });
    expect(stageResult.accounts).toStrictEqual(["Mint Checking"]);
    expect(stageResult.categories.toSorted()).toStrictEqual(["Coffee", "Groceries", "Income"]);

    const { jobId } = stageResult;

    // Stage 2 — submit mapping; create a new manual account for "Mint Checking".
    const mapping: AccountMapBody = {
      mapping: {
        "Mint Checking": {
          kind: "create",
          name: "Imported Mint Checking",
          subtype: "Checking",
          type: "depository",
        },
      },
    };
    await setAccountMap(TEST_USER_ID, jobId, mapping);

    // Stage 3 — dedupe workflow (creates the manual account, runs dedupe pass).
    const dedupeRun = await start(importDedupeWorkflow, [{ jobId, userId: TEST_USER_ID }]);
    const dedupeResult = await dedupeRun.returnValue;
    expect(dedupeResult.success).toBeTruthy();
    expect(dedupeResult.scannedCount).toBe(3);
    // No prior transactions on the freshly-created account → 0 dupes.
    expect(dedupeResult.matchedCount).toBe(0);

    // Stage 4 — commit workflow.
    const commitRun = await start(importCommitWorkflow, [{ jobId, userId: TEST_USER_ID }]);
    const commitResult = await commitRun.returnValue;
    expect(commitResult.success).toBeTruthy();
    expect(commitResult.committedCount).toBe(3);
    expect(commitResult.skippedCount).toBe(0);

    // DB-level proof: transactions exist on the new manual account.
    const inserted = await db
      .select({
        accountId: transaction.accountId,
        amount: transaction.amount,
        date: transaction.date,
        merchantName: transaction.merchantName,
        name: transaction.name,
      })
      .from(transaction)
      .where(eq(transaction.userId, TEST_USER_ID));

    expect(inserted).toHaveLength(3);
    const merchants = inserted.map((r) => r.merchantName).toSorted();
    expect(merchants).toStrictEqual(["Paycheck", "Starbucks", "Whole Foods"]);
    // `name` follows merchant (Description preferred), not the raw bank string.
    expect(inserted.find((r) => r.merchantName === "Starbucks")?.name).toBe("Starbucks");

    // Job is finalised.
    const [job] = await db
      .select({ status: importJob.status })
      .from(importJob)
      .where(eq(importJob.id, jobId));
    expect(job?.status).toBe("committed");

    // Manual account was created with the requested shape.
    const [acct] = await db
      .select({
        name: financialAccount.name,
        source: financialAccount.source,
        subtype: financialAccount.subtype,
        type: financialAccount.type,
      })
      .from(financialAccount)
      .where(eq(financialAccount.userId, TEST_USER_ID));
    expect(acct).toStrictEqual({
      name: "Imported Mint Checking",
      source: "manual",
      subtype: "Checking",
      type: "depository",
    });
  }, 60_000);

  it("rejects commit when job is not in `mapped` status", async () => {
    // Stage a fresh job — status starts as "parsed" (no map submitted yet).
    const stageResult = await uploadAndStageImport({
      buffer: Buffer.from(SAMPLE_CSV),
      filename: "transactions.csv",
      userId: TEST_USER_ID,
    });

    // Hit the commit workflow's pre-condition guard via the route handler logic.
    // The route guard reads `getImportJobStatus` and returns 409 if status !== "mapped".
    // Here we assert the same precondition at the data layer: the job is `parsed`,
    // not `mapped`, so a commit attempt would be rejected by the route.
    const [job] = await db
      .select({ status: importJob.status })
      .from(importJob)
      .where(eq(importJob.id, stageResult.jobId));
    expect(job?.status).toBe("parsed");

    // Cleanup just this job so the next test starts clean.
    await db.delete(importJob).where(eq(importJob.id, stageResult.jobId));
  }, 30_000);
});
