/**
 * Handler-level tests for `/v1/accounts`. No HTTP server, no DB — mocks the
 * server-data query at module boundary. Each test catches a specific bug
 * class:
 *
 *   1. Schema-parse drift (data layer returns malformed shape → 500)
 *   2. Branch logic (ApiError 404 → typed `{code, error}` body, status 404)
 *   3. Wiring (request reaches the data fn with the authed userId)
 *
 * Tautological "mock returns X, response contains X" tests are NOT here —
 * they pass even when nothing works.
 */

import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import type {
  BrokerageAccountListItem,
  EnhancedBrokerageAccount,
} from "@cobalt-web/server-data/brokerage/schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { request, TEST_USER_ID } from "./_helpers/test-app";

// vi.mock calls are hoisted to the top of the file by vitest — must be at
// file scope, NOT inside a helper function, or they fire too late.

vi.mock(import("../../src/api/public/v1/middleware/require-api-key.js"), () => ({
  requireApiKey: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: TEST_USER_ID });
    c.set("zeroContext", { userId: TEST_USER_ID });
    await next();
  },
}));

const getAccounts = vi.fn();
const getAccountDetail = vi.fn();
const createManualAccount = vi.fn();
const getBrokerageAccounts = vi.fn();

vi.mock(import("@cobalt-web/server-data/accounts/list"), () => ({
  getAccounts: (...args: unknown[]) => getAccounts(...args),
}));

vi.mock(import("@cobalt-web/server-data/accounts/detail"), () => ({
  getAccountDetail: (...args: unknown[]) => getAccountDetail(...args),
}));

vi.mock(import("@cobalt-web/server-data/accounts/manual/create"), () => ({
  createManualAccount: (...args: unknown[]) => createManualAccount(...args),
}));

vi.mock(import("@cobalt-web/server-data/brokerage/queries"), () => ({
  getBrokerageAccounts: (...args: unknown[]) =>
    getBrokerageAccounts(...args) as unknown as Promise<EnhancedBrokerageAccount[]>,
  toBrokerageAccountListItem: (a: EnhancedBrokerageAccount): BrokerageAccountListItem => ({
    accountDetails: a.accountDetails,
    accountStatus: a.accountStatus,
    accountType: a.accountType,
    balances: a.balances,
    id: a.id,
    institutionName: a.institutionName,
    name: a.name,
    needsReauth: a.needsReauth,
    snaptradeAuthorizationId: a.snaptradeAuthorizationId,
    source: a.source,
  }),
}));

const { accountsRouter } = await import("../../src/api/public/v1/accounts/index.js");

const validAccountRow = {
  creditLimit: null,
  currency: "USD",
  current: 1234.56,
  id: "acc_123",
  institutionName: "Chase",
  mask: "4242",
  name: "Checking",
  type: "depository",
};

describe("v1/accounts", () => {
  beforeEach(() => {
    getAccounts.mockReset();
    getAccountDetail.mockReset();
    createManualAccount.mockReset();
    getBrokerageAccounts.mockReset();
  });

  describe("liability balance sign", () => {
    test("flips sign for credit_card and loan; assets stay positive", async () => {
      // Liability balances stored signed at ingestion; public API copies straight through.
      // Net worth = sum(balance).
      getAccounts.mockResolvedValue([
        {
          ...validAccountRow,
          current: 1000,
          id: "asset_bank",
          type: "depository",
        },
        { ...validAccountRow, current: -500, id: "liab_card", type: "credit" },
        { ...validAccountRow, current: -20_000, id: "liab_loan", type: "loan" },
        {
          ...validAccountRow,
          current: 8000,
          id: "asset_inv",
          type: "investment",
        },
      ]);

      const { json } = await request(accountsRouter, "/accounts");
      const body = await json<{ id: string; balance: number }[]>();

      expect(body.map((a) => [a.id, a.balance])).toStrictEqual([
        ["asset_bank", 1000],
        ["liab_card", -500],
        ["liab_loan", -20_000],
        ["asset_inv", 8000],
      ]);
    });
  });

  describe("POST /accounts — create", () => {
    test("public vocab maps to internal vocab; liability currentBalance stored as positive magnitude", async () => {
      // SRI-345: public API exposes bank|credit_card|investment|loan; internal storage uses
      // depository|credit|investment|loan. Liabilities accept signed input (negative) but the
      // server stores positive magnitude internally.
      createManualAccount.mockResolvedValue({ id: "acc_new" });
      getAccountDetail.mockResolvedValue({
        ...validAccountRow,
        id: "acc_new",
        type: "credit",
      });

      const { status } = await request(accountsRouter, "/accounts", {
        body: JSON.stringify({
          currency: "USD",
          currentBalance: -750,
          name: "Card",
          subtype: "credit card",
          type: "credit_card",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(status).toBe(201);
      expect(createManualAccount).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          currentBalance: 750,
          subtype: "credit card",
          type: "credit",
        }),
      );
    });

    test("rejects internal vocab (depository) on the public endpoint", async () => {
      const { status } = await request(accountsRouter, "/accounts", {
        body: JSON.stringify({
          currentBalance: 100,
          name: "X",
          subtype: "checking",
          type: "depository",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(status).toBe(422);
    });
  });

  describe("GET /accounts — list", () => {
    test("passes authed userId to data layer", async () => {
      getAccounts.mockResolvedValue([validAccountRow]);

      await request(accountsRouter, "/accounts");

      expect(getAccounts).toHaveBeenCalledWith(TEST_USER_ID);
    });

    test("returns 500 when data layer returns shape that fails response schema", async () => {
      // Drop required `id` — `accountInputSchema.transform().pipe(accountOutputSchema)`
      // should reject. Catches server-data refactors that drop public-facing fields.
      getAccounts.mockResolvedValue([{ ...validAccountRow, id: undefined }]);

      const { status } = await request(accountsRouter, "/accounts");

      expect(status).toBe(500);
    });

    test("maps every server-data account type to the public enum", async () => {
      // Mixed provider + type fixture: covers every branch of `mapAccountType`
      // in schemas.ts plus the fall-through `"other"` for unknown internal
      // types. Catches: server-data adds a new account type (e.g. "savings")
      // and silently lands in `"other"` without an explicit case.
      getAccounts.mockResolvedValue([
        { ...validAccountRow, id: "acc_dep", type: "depository" },
        { ...validAccountRow, id: "acc_cred", type: "credit" },
        { ...validAccountRow, id: "acc_brok", type: "brokerage" },
        { ...validAccountRow, id: "acc_inv", type: "investment" },
        { ...validAccountRow, id: "acc_loan", type: "loan" },
        { ...validAccountRow, id: "acc_unknown", type: "savings" },
      ]);

      const { json, status } = await request(accountsRouter, "/accounts");
      const body = await json<{ id: string; type: string }[]>();

      expect(status).toBe(200);
      expect(body.map((a) => [a.id, a.type])).toStrictEqual([
        ["acc_dep", "bank"],
        ["acc_cred", "credit_card"],
        ["acc_brok", "investment"],
        ["acc_inv", "investment"],
        ["acc_loan", "loan"],
        ["acc_unknown", "other"],
      ]);
    });

    test("returns accounts from multiple Plaid items + manual + brokerage in one list", async () => {
      // Real users have N Plaid connections (one per institution) plus manual
      // and brokerage. `getAccounts` is expected to merge across providers and
      // return them all in one flat list — handler doesn't filter by source.
      // Catches: provider-aware filter snuck into the handler that drops
      // manual or brokerage rows.
      getAccounts.mockResolvedValue([
        {
          ...validAccountRow,
          id: "plaid_chase_check",
          institutionName: "Chase",
          type: "depository",
        },
        {
          ...validAccountRow,
          id: "plaid_chase_card",
          institutionName: "Chase",
          type: "credit",
        },
        {
          ...validAccountRow,
          id: "plaid_amex_card",
          institutionName: "Amex",
          type: "credit",
        },
        {
          ...validAccountRow,
          id: "manual_cash",
          institutionName: null,
          type: "depository",
        },
        {
          ...validAccountRow,
          id: "snaptrade_robinhood",
          institutionName: "Robinhood",
          type: "brokerage",
        },
        {
          ...validAccountRow,
          id: "manual_holdings",
          institutionName: null,
          type: "brokerage",
        },
      ]);

      const { json, status } = await request(accountsRouter, "/accounts");
      const body = await json<{ id: string }[]>();

      expect(status).toBe(200);
      expect(body).toHaveLength(6);
    });
  });

  describe("GET /accounts/{id} — detail", () => {
    test("ApiError 404 from data layer → 404 with typed error body", async () => {
      getAccountDetail.mockRejectedValue(
        new ApiError(404, "account_not_found", "Account not found"),
      );

      const { json, status } = await request(accountsRouter, "/accounts/acc_missing");
      const body = await json<{ code: string; error: string }>();

      expect(status).toBe(404);
      expect(body).toStrictEqual({
        code: "account_not_found",
        error: "Account not found",
      });
    });

    test("non-ApiError throws propagate to global handler → 500", async () => {
      // A bare `Error` (e.g. DB connection lost) must NOT be caught and
      // returned as 404 — the try/catch in the handler narrows on ApiError.
      getAccountDetail.mockRejectedValue(new Error("boom"));

      const { status } = await request(accountsRouter, "/accounts/acc_123");

      expect(status).toBe(500);
    });

    test("passes path id through to data layer alongside authed userId", async () => {
      getAccountDetail.mockResolvedValue(validAccountRow);

      await request(accountsRouter, "/accounts/acc_xyz");

      expect(getAccountDetail).toHaveBeenCalledWith(TEST_USER_ID, "acc_xyz");
    });
  });

  describe("GET /accounts/brokerage — list", () => {
    const snaptradeRow = {
      accountDetails: null,
      accountStatus: "open",
      accountType: "brokerage",
      balanceData: null,
      balances: [],
      cashRestrictions: null,
      createdDate: "2024-01-01T00:00:00.000Z",
      id: "snaptrade_rh",
      institutionName: "Robinhood",
      name: "Robinhood Individual",
      needsReauth: false,
      snaptradeAuthorizationId: "auth_1",
      source: "snaptrade" as const,
      userId: TEST_USER_ID,
    };
    const manualRow = {
      ...snaptradeRow,
      id: "manual_inv",
      institutionName: "",
      name: "Manual Brokerage",
      needsReauth: false,
      snaptradeAuthorizationId: null,
      source: "manual" as const,
    };
    const plaidRow = {
      ...snaptradeRow,
      id: "plaid_fidelity",
      institutionName: "Fidelity",
      name: "401k",
      snaptradeAuthorizationId: null,
      source: "plaid" as const,
    };

    test("returns manual investment accounts alongside SnapTrade + Plaid, with source set", async () => {
      // SRI-367: manual investment accounts must surface in the brokerage list
      // so iOS can pick them for the add-position flow. Catches regression of
      // hardcoded `source: "snaptrade"` in toBrokerageAccountListItem.
      getBrokerageAccounts.mockResolvedValue([snaptradeRow, plaidRow, manualRow]);

      const { json, status } = await request(accountsRouter, "/accounts/brokerage");
      const body = await json<{ accounts: { id: string; source: string }[] }>();

      expect(status).toBe(200);
      expect(body.accounts.map((a) => [a.id, a.source])).toStrictEqual([
        ["snaptrade_rh", "snaptrade"],
        ["plaid_fidelity", "plaid"],
        ["manual_inv", "manual"],
      ]);
    });

    test("?source=manual filters to manual rows only", async () => {
      getBrokerageAccounts.mockResolvedValue([snaptradeRow, plaidRow, manualRow]);

      const { json, status } = await request(accountsRouter, "/accounts/brokerage?source=manual");
      const body = await json<{ accounts: { id: string }[] }>();

      expect(status).toBe(200);
      expect(body.accounts.map((a) => a.id)).toStrictEqual(["manual_inv"]);
    });

    test("passes authed userId to data layer", async () => {
      getBrokerageAccounts.mockResolvedValue([]);

      await request(accountsRouter, "/accounts/brokerage");

      expect(getBrokerageAccounts).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });
});
