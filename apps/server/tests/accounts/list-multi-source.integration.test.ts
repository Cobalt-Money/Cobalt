/**
 * DB-level coverage for the unified `/api/accounts` REST surface (#352).
 *
 * Seeds one user with the full account fixture matrix:
 *   plaid     × depository / credit / brokerage
 *   manual    × depository (cash) / credit / loan
 *   snaptrade × brokerage
 *
 * Exercises every read + write path:
 *   - getBankAccounts (no filter / ?type=depository|credit|loan)
 *   - getAccountDetail (per source)
 *   - patchAccount (set / clear / 404)
 *
 * Catches regression of the original bug — `getBankAccountsJoined` filtering
 * `source = "plaid"` — and locks in the type-filter contract that replaced
 * the dedicated `/credit-cards` endpoint.
 */

import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { getAccountDetail } from "@cobalt-web/server-data/accounts/detail";
import { getBankAccounts } from "@cobalt-web/server-data/accounts/list";
import { patchAccount } from "@cobalt-web/server-data/accounts/patch";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000352";
const FOREIGN_USER_ID = "00000000-0000-4000-8000-000000000353";
const SEED_TAG = `seed-352-${Date.now()}`;
const PLAID_ITEM_ID = `${SEED_TAG}-item`;

interface SeededIds {
  plaidDepository: string;
  plaidCredit: string;
  plaidBrokerage: string;
  manualDepository: string;
  manualCredit: string;
  manualLoan: string;
  snaptradeBrokerage: string;
  foreignManual: string;
}

async function ensureUser(id: string, email: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO "user" (id, email, name, email_verified, created_at, updated_at)
    VALUES (${id}, ${email}, 'Integration-352', false, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

async function seed(): Promise<SeededIds> {
  const [conn] = await db
    .insert(plaidConnection)
    .values({
      institutionId: "ins_test",
      institutionName: "Chase",
      plaidAccessToken: `${SEED_TAG}-token`,
      plaidItemId: PLAID_ITEM_ID,
      userId: TEST_USER_ID,
    })
    .returning({ id: plaidConnection.id });
  if (!conn) {
    throw new Error("Failed to seed plaidConnection");
  }

  const rows = await db
    .insert(financialAccount)
    .values([
      {
        externalId: `${SEED_TAG}-plaid-dep`,
        mask: "1111",
        name: "Plaid Checking",
        plaidConnectionId: conn.id,
        source: "plaid",
        subtype: "checking",
        type: "depository",
        userId: TEST_USER_ID,
      },
      {
        externalId: `${SEED_TAG}-plaid-cred`,
        mask: "2222",
        name: "Plaid Sapphire",
        plaidConnectionId: conn.id,
        source: "plaid",
        subtype: "credit card",
        type: "credit",
        userId: TEST_USER_ID,
      },
      {
        externalId: `${SEED_TAG}-plaid-brok`,
        mask: "3333",
        name: "Plaid Brokerage",
        plaidConnectionId: conn.id,
        source: "plaid",
        subtype: "brokerage",
        type: "brokerage",
        userId: TEST_USER_ID,
      },
      {
        institutionName: null,
        mask: null,
        name: "Cash Wallet",
        source: "manual",
        subtype: "cash",
        type: "depository",
        userId: TEST_USER_ID,
      },
      {
        institutionName: null,
        mask: null,
        name: "Store Card",
        source: "manual",
        subtype: "credit card",
        type: "credit",
        userId: TEST_USER_ID,
      },
      {
        institutionName: null,
        mask: null,
        name: "Student Loan",
        source: "manual",
        subtype: "student",
        type: "loan",
        userId: TEST_USER_ID,
      },
      {
        institutionName: "Robinhood",
        mask: "4444",
        name: "Robinhood Brokerage",
        source: "snaptrade",
        subtype: "brokerage",
        type: "brokerage",
        userId: TEST_USER_ID,
      },
      {
        institutionName: null,
        mask: null,
        name: "Foreign Cash",
        source: "manual",
        subtype: "cash",
        type: "depository",
        userId: FOREIGN_USER_ID,
      },
    ])
    .returning({ id: financialAccount.id, name: financialAccount.name });

  // Seed balance row for the plaid-credit account so credit-limit mutations
  // have something to update.
  const plaidCredit = rows.find((r) => r.name === "Plaid Sapphire");
  const manualCredit = rows.find((r) => r.name === "Store Card");
  if (plaidCredit) {
    await db.insert(balance).values({
      accountId: plaidCredit.id,
      creditLimit: "10000",
      currency: "USD",
      current: "-1234.56",
      userId: TEST_USER_ID,
    });
  }
  if (manualCredit) {
    await db.insert(balance).values({
      accountId: manualCredit.id,
      creditLimit: "5000",
      currency: "USD",
      current: "-200",
      userId: TEST_USER_ID,
    });
  }

  const byName = (n: string) => {
    const row = rows.find((r) => r.name === n);
    if (!row) {
      throw new Error(`seed missing row: ${n}`);
    }
    return row.id;
  };

  return {
    foreignManual: byName("Foreign Cash"),
    manualCredit: byName("Store Card"),
    manualDepository: byName("Cash Wallet"),
    manualLoan: byName("Student Loan"),
    plaidBrokerage: byName("Plaid Brokerage"),
    plaidCredit: byName("Plaid Sapphire"),
    plaidDepository: byName("Plaid Checking"),
    snaptradeBrokerage: byName("Robinhood Brokerage"),
  };
}

async function cleanup(): Promise<void> {
  await db.delete(financialAccount).where(eq(financialAccount.userId, TEST_USER_ID));
  await db.delete(financialAccount).where(eq(financialAccount.userId, FOREIGN_USER_ID));
  await db.delete(plaidConnection).where(eq(plaidConnection.userId, TEST_USER_ID));
  await db.execute(sql`DELETE FROM "user" WHERE id IN (${TEST_USER_ID}, ${FOREIGN_USER_ID})`);
}

let ids: SeededIds;

describe("/api/accounts — unified multi-source surface (#352)", () => {
  beforeAll(async () => {
    await cleanup();
    await ensureUser(TEST_USER_ID, "352-multi@test.local");
    await ensureUser(FOREIGN_USER_ID, "352-foreign@test.local");
    ids = await seed();
  });

  afterAll(cleanup);

  describe("getBankAccounts — list", () => {
    it("default scope returns depository + credit + loan across all sources", async () => {
      const rows = await getBankAccounts(TEST_USER_ID);
      const names = rows.map((r) => r.name).toSorted();
      expect(names).toStrictEqual(
        [
          "Cash Wallet",
          "Plaid Checking",
          "Plaid Sapphire",
          "Store Card",
          "Student Loan",
        ].toSorted(),
      );
      // Excludes brokerage rows even though they exist in financial_account
      expect(names).not.toContain("Plaid Brokerage");
      expect(names).not.toContain("Robinhood Brokerage");
    });

    it("?type=depository returns plaid + manual depository only", async () => {
      const rows = await getBankAccounts(TEST_USER_ID, { type: "depository" });
      expect(rows.map((r) => r.name).toSorted()).toStrictEqual(
        ["Cash Wallet", "Plaid Checking"].toSorted(),
      );
    });

    it("?type=credit returns plaid + manual credit only", async () => {
      const rows = await getBankAccounts(TEST_USER_ID, { type: "credit" });
      expect(rows.map((r) => r.name).toSorted()).toStrictEqual(
        ["Plaid Sapphire", "Store Card"].toSorted(),
      );
    });

    it("?type=loan returns manual loan only", async () => {
      const rows = await getBankAccounts(TEST_USER_ID, { type: "loan" });
      expect(rows.map((r) => r.name)).toStrictEqual(["Student Loan"]);
    });

    it("manual rows expose source='manual' and null plaid-derived fields", async () => {
      const rows = await getBankAccounts(TEST_USER_ID);
      const cash = rows.find((r) => r.name === "Cash Wallet");
      expect(cash).toBeDefined();
      expect(cash?.source).toBe("manual");
      expect(cash?.plaidItemId).toBeNull();
      expect(cash?.needsReauth).toBeFalsy();
    });

    it("plaid rows surface institutionName from plaid_connection", async () => {
      const rows = await getBankAccounts(TEST_USER_ID);
      const plaid = rows.find((r) => r.name === "Plaid Checking");
      expect(plaid?.source).toBe("plaid");
      expect(plaid?.institutionName).toBe("Chase");
      expect(plaid?.plaidItemId).toBe(PLAID_ITEM_ID);
    });

    it("does not leak the foreign user's accounts", async () => {
      const rows = await getBankAccounts(TEST_USER_ID);
      expect(rows.map((r) => r.id)).not.toContain(ids.foreignManual);
    });
  });

  describe("getAccountDetail — single", () => {
    it("resolves a plaid row by internal id", async () => {
      const d = await getAccountDetail(TEST_USER_ID, ids.plaidDepository);
      expect(d.id).toBe(ids.plaidDepository);
      expect(d.source).toBe("plaid");
      expect(d.plaidItemId).toBe(PLAID_ITEM_ID);
    });

    it("resolves a manual row by internal id", async () => {
      const d = await getAccountDetail(TEST_USER_ID, ids.manualDepository);
      expect(d.source).toBe("manual");
      expect(d.plaidItemId).toBeNull();
    });

    it("resolves a snaptrade row by internal id", async () => {
      const d = await getAccountDetail(TEST_USER_ID, ids.snaptradeBrokerage);
      expect(d.source).toBe("snaptrade");
      expect(d.plaidItemId).toBeNull();
      expect(d.institutionName).toBe("Robinhood");
    });

    it("throws ApiError(404) for an id belonging to a different user", async () => {
      const err = await getAccountDetail(TEST_USER_ID, ids.foreignManual).catch((error) => error);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    });

    it("throws ApiError(404) for a non-existent id", async () => {
      const err = await getAccountDetail(
        TEST_USER_ID,
        "00000000-0000-4000-8000-000000000999",
      ).catch((error) => error);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    });
  });

  describe("patchAccount — credit-limit", () => {
    it("sets userOverrideCreditLimit (stored as negative magnitude)", async () => {
      await patchAccount(TEST_USER_ID, ids.plaidCredit, { creditLimit: 7500 });
      const row = await db.query.balance.findFirst({
        columns: { userOverrideCreditLimit: true },
        where: { accountId: { eq: ids.plaidCredit } },
      });
      expect(Number(row?.userOverrideCreditLimit)).toBe(-7500);
    });

    it("works on manual credit rows too (source-agnostic)", async () => {
      await patchAccount(TEST_USER_ID, ids.manualCredit, { creditLimit: 2000 });
      const row = await db.query.balance.findFirst({
        columns: { userOverrideCreditLimit: true },
        where: { accountId: { eq: ids.manualCredit } },
      });
      expect(Number(row?.userOverrideCreditLimit)).toBe(-2000);
    });

    it("creditLimit: null clears the override", async () => {
      await patchAccount(TEST_USER_ID, ids.plaidCredit, { creditLimit: null });
      const row = await db.query.balance.findFirst({
        columns: { userOverrideCreditLimit: true },
        where: { accountId: { eq: ids.plaidCredit } },
      });
      expect(row?.userOverrideCreditLimit).toBeNull();
    });

    it("rejects writes to a foreign user's account with 404", async () => {
      const err = await patchAccount(TEST_USER_ID, ids.foreignManual, {
        creditLimit: 100,
      }).catch((error) => error);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    });

    it("empty patch still 404s a non-existent id", async () => {
      const err = await patchAccount(
        TEST_USER_ID,
        "00000000-0000-4000-8000-000000000999",
        {},
      ).catch((error) => error);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    });
  });
});
