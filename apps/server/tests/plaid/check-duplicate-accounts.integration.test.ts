/**
 * DB-level unit test for `checkForDuplicateAccounts`.
 *
 * No workflow runtime, no Nitro, no Plaid — just: seed rows, call the query
 * function, assert. Isolates the "does the duplicate check actually find a
 * seeded match" question from RLS / workflow-context concerns that the full
 * onboarding integration test can't untangle.
 *
 * If this passes → the function logic is correct; any full-stack failure is
 *   in the workflow/step/RLS layer.
 * If this fails → the bug is in the function itself (query shape, relation
 *   pull, mask matcher wiring).
 *
 * Uses the integration vitest config so LOCAL_DATABASE_URL points at docker
 * Postgres on :5433. Nitro spawn still happens via globalSetup (cost: a few
 * seconds); that's fine, we just don't use it.
 */

import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { checkForDuplicateAccounts } from "@cobalt-web/server-data/providers/plaid/link/queries";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000003";
const INSTITUTION_ID = "ins_109508";
const SEED_ITEM_ID = `seed-dup-check-${Date.now()}`;
const SEED_ACCOUNT_ID = `seed-acct-check-${Date.now()}`;
const SEED_ACCOUNT_NAME = "Seeded Checking";

async function ensureTestUser(): Promise<void> {
  await db.execute(
    `INSERT INTO "user" (id, email, name, email_verified, created_at, updated_at)
     VALUES ('${TEST_USER_ID}', 'check-dup-integration@test.local',
             'Integration-CheckDup', false, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`
  );
}

async function seed(): Promise<void> {
  const [conn] = await db
    .insert(plaidConnection)
    .values({
      institutionId: INSTITUTION_ID,
      plaidAccessToken: `seed-token-${SEED_ITEM_ID}`,
      plaidItemId: SEED_ITEM_ID,
      userId: TEST_USER_ID,
    })
    .returning({ id: plaidConnection.id });
  if (!conn) {
    throw new Error("Failed to seed plaidConnection");
  }
  await db.insert(financialAccount).values({
    externalId: SEED_ACCOUNT_ID,
    mask: "0000",
    name: SEED_ACCOUNT_NAME,
    plaidConnectionId: conn.id,
    source: "plaid",
    subtype: "checking",
    type: "depository",
    userId: TEST_USER_ID,
  });
}

async function cleanup(): Promise<void> {
  await db
    .delete(plaidConnection)
    .where(eq(plaidConnection.plaidItemId, SEED_ITEM_ID));
  await db
    .delete(plaidConnection)
    .where(eq(plaidConnection.userId, TEST_USER_ID));
  await db.execute(`DELETE FROM "user" WHERE id = '${TEST_USER_ID}'`);
}

describe("checkForDuplicateAccounts — DB-level", () => {
  beforeEach(async () => {
    await cleanup();
    await ensureTestUser();
    await seed();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("detects full overlap on (institutionId, mask, type)", async () => {
    const result = await checkForDuplicateAccounts(
      TEST_USER_ID,
      INSTITUTION_ID,
      [
        {
          mask: "0000",
          name: "Plaid Checking",
          persistentAccountId: null,
          type: "depository",
        },
      ]
    );

    expect(result.isDuplicate).toBeTruthy();
    expect(result.duplicateAccounts).toHaveLength(1);
    expect(result.duplicateAccounts[0]?.name).toBe(SEED_ACCOUNT_NAME);
  });

  it("returns no duplicate when masks differ", async () => {
    const result = await checkForDuplicateAccounts(
      TEST_USER_ID,
      INSTITUTION_ID,
      [
        {
          mask: "9999",
          name: "Plaid Checking",
          persistentAccountId: null,
          type: "depository",
        },
      ]
    );

    expect(result.isDuplicate).toBeFalsy();
    expect(result.duplicateAccounts).toStrictEqual([]);
  });

  it("returns no duplicate when institutionId is null", async () => {
    const result = await checkForDuplicateAccounts(TEST_USER_ID, null, [
      {
        mask: "0000",
        name: "Plaid Checking",
        persistentAccountId: null,
        type: "depository",
      },
    ]);

    expect(result.isDuplicate).toBeFalsy();
  });

  it("scopes by userId — does not match another user's connections", async () => {
    const otherUserId = "00000000-0000-4000-8000-000000000099";
    const result = await checkForDuplicateAccounts(
      otherUserId,
      INSTITUTION_ID,
      [
        {
          mask: "0000",
          name: "Plaid Checking",
          persistentAccountId: null,
          type: "depository",
        },
      ]
    );

    expect(result.isDuplicate).toBeFalsy();
  });
});
