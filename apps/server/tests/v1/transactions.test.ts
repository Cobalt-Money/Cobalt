/**
 * `/v1/transactions` — covers list + detail + create + set-tags. Focused on:
 *   - `toTransaction` mapper (drops internal fields, coerces date/notes)
 *   - List filter wiring (accountId post-filter, pagination passthrough)
 *   - Create: schema validation (422), shape mapping into createManualTransactions
 *   - Detail: ApiError 404 → typed body
 *   - set-tags: param wiring + 404 on post-update refetch
 */

import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { request, TEST_USER_ID } from "./_helpers/test-app";

vi.mock(import("../../src/api/public/v1/middleware/require-api-key.js"), () => ({
  requireApiKey: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: TEST_USER_ID });
    c.set("zeroContext", { userId: TEST_USER_ID });
    await next();
  },
}));

const getTransactions = vi.fn();
const getTransactionDetail = vi.fn();
const createManualTransactions = vi.fn();
const setTransactionTags = vi.fn();

vi.mock(import("@cobalt-web/server-data/transactions/list"), () => ({
  getTransactions: (...args: unknown[]) => getTransactions(...args),
}));
vi.mock(import("@cobalt-web/server-data/transactions/detail"), () => ({
  getTransactionDetail: (...args: unknown[]) => getTransactionDetail(...args),
}));
vi.mock(import("@cobalt-web/server-data/transactions/create"), () => ({
  createManualTransactions: (...args: unknown[]) => createManualTransactions(...args),
}));
vi.mock(import("@cobalt-web/server-data/transactions/tags/mutations"), () => ({
  setTransactionTags: (...args: unknown[]) => setTransactionTags(...args),
}));

const { transactionsRouter } = await import("../../src/api/public/v1/transactions/index.js");

// Shape of `TransactionResponse` from server-data — superset of what public
// emits. `toTransaction` MUST strip the extras (source, location, lockedFields,
// logoUrl, plaidAccountId, accountName, institution*, counterparties).
const validTxnRow = {
  accountId: "acc_1",
  accountLogoDomain: null,
  accountName: "Chase",
  accountSubtype: null,
  accountType: "depository",
  amount: 9.99,
  authorizedDate: null,
  category: {
    groupName: "Subs",
    groupSystemKey: null,
    iconKey: "music",
    id: "20000000-0000-4000-a000-000000000001",
    name: "Spotify",
    systemKey: "spotify",
  },
  counterparties: [],
  date: "2026-05-22",
  id: "10000000-0000-4000-a000-000000000001",
  institutionLogo: null,
  institutionName: null,
  institutionUrl: null,
  location: null,
  lockedFields: [],
  logoUrl: null,
  merchantName: "Spotify",
  name: "SPOTIFY",
  notes: null,
  pending: false,
  plaidAccountId: null,
  source: "manual" as const,
  tagIds: [],
  website: null,
};

describe("v1/transactions", () => {
  beforeEach(() => {
    getTransactions.mockReset();
    getTransactionDetail.mockReset();
    createManualTransactions.mockReset();
    setTransactionTags.mockReset();
  });

  describe("GET /transactions — list", () => {
    test("toTransaction strips internal fields and aliases category to name", async () => {
      // Public schema commits to a tight surface. If server-data adds a
      // field (e.g. `location`, `lockedFields`), the mapper must not leak
      // it. Catches: refactor that spreads `...tx` and accidentally exposes
      // PII / locked-field internals.
      getTransactions.mockResolvedValue({
        hasMore: false,
        nextCursor: null,
        transactions: [validTxnRow],
      });

      const { json, status } = await request(transactionsRouter, "/transactions");
      const body = await json<{
        items: Record<string, unknown>[];
      }>();

      expect(status).toBe(200);
      const [tx] = body.items;
      if (!tx) {
        throw new Error("expected at least one transaction in response");
      }
      expect(tx).toStrictEqual({
        accountId: "acc_1",
        amount: 9.99,
        category: "Spotify",
        date: "2026-05-22",
        id: "10000000-0000-4000-a000-000000000001",
        merchant: "Spotify",
        name: "SPOTIFY",
        notes: null,
        pending: false,
        tagIds: [],
      });
      // Sanity: explicit leak checks for the fields most likely to slip out.
      for (const banned of [
        "source",
        "location",
        "lockedFields",
        "plaidAccountId",
        "accountName",
        "institutionLogo",
        "counterparties",
      ]) {
        expect(tx[banned]).toBeUndefined();
      }
    });

    test("post-filters by accountId without forwarding to data layer", async () => {
      getTransactions.mockResolvedValue({
        hasMore: false,
        nextCursor: null,
        transactions: [
          validTxnRow,
          { ...validTxnRow, accountId: "acc_2", id: "10000000-0000-4000-a000-000000000002" },
        ],
      });

      const { json } = await request(transactionsRouter, "/transactions?accountId=acc_2");
      const body = await json<{ items: { id: string }[] }>();

      expect(body.items).toHaveLength(1);
      expect(body.items[0]?.id).toBe("10000000-0000-4000-a000-000000000002");
      expect(getTransactions).toHaveBeenCalledWith(TEST_USER_ID, {
        cursor: undefined,
        endDate: undefined,
        limit: 50,
        startDate: undefined,
      });
    });

    test("passes cursor + dates + limit to data layer", async () => {
      getTransactions.mockResolvedValue({ hasMore: true, nextCursor: "abc", transactions: [] });

      await request(
        transactionsRouter,
        "/transactions?cursor=xyz&startDate=2026-01-01&endDate=2026-05-22&limit=25",
      );

      expect(getTransactions).toHaveBeenCalledWith(TEST_USER_ID, {
        cursor: "xyz",
        endDate: "2026-05-22",
        limit: 25,
        startDate: "2026-01-01",
      });
    });
  });

  describe("POST /transactions — create", () => {
    test("rejects body missing required fields with 422", async () => {
      const { status } = await request(transactionsRouter, "/transactions", {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(status).toBe(422);
      expect(createManualTransactions).not.toHaveBeenCalled();
    });

    test("rejects malformed date with 422", async () => {
      // Body schema's `date` is regex `^\d{4}-\d{2}-\d{2}$`. Catches:
      // someone loosens the regex and ships invalid date strings into
      // server-data (which expects a Postgres-parseable date).
      const { status } = await request(transactionsRouter, "/transactions", {
        body: JSON.stringify({
          accountId: "acc_1",
          amount: 9.99,
          date: "05/22/2026",
          name: "x",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(status).toBe(422);
    });

    test("fills currency + website nulls + coerces merchantName undefined → null", async () => {
      // Public body omits currency/website (internal-only). Handler must
      // pad them with null before calling createManualTransactions, else
      // server-data's insert schema rejects.
      createManualTransactions.mockResolvedValue({ ids: ["10000000-0000-4000-a000-000000000003"] });
      getTransactionDetail.mockResolvedValue({
        ...validTxnRow,
        id: "10000000-0000-4000-a000-000000000003",
      });

      await request(transactionsRouter, "/transactions", {
        body: JSON.stringify({
          accountId: "acc_1",
          amount: 9.99,
          date: "2026-05-22",
          name: "Coffee",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(createManualTransactions).toHaveBeenCalledWith(TEST_USER_ID, [
        {
          accountId: "acc_1",
          amount: 9.99,
          categoryId: null,
          currency: null,
          date: "2026-05-22",
          merchantName: null,
          name: "Coffee",
          notes: null,
          website: null,
        },
      ]);
    });

    test("maps server-data ApiError 400 → typed 400", async () => {
      createManualTransactions.mockRejectedValue(
        new ApiError(400, "account_not_manual", "Account is not manual"),
      );

      const { json, status } = await request(transactionsRouter, "/transactions", {
        body: JSON.stringify({
          accountId: "acc_synced",
          amount: 9.99,
          date: "2026-05-22",
          name: "Coffee",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await json<{ code: string; error: string }>();

      expect(status).toBe(400);
      expect(body).toStrictEqual({ code: "account_not_manual", error: "Account is not manual" });
    });
  });

  describe("GET /transactions/{transactionId} — detail", () => {
    test("ApiError 404 → typed body", async () => {
      getTransactionDetail.mockRejectedValue(
        new ApiError(404, "transaction_not_found", "Transaction not found"),
      );

      const { json, status } = await request(
        transactionsRouter,
        "/transactions/10000000-0000-4000-a000-000000000004",
      );
      const body = await json<{ code: string }>();

      expect(status).toBe(404);
      expect(body.code).toBe("transaction_not_found");
    });
  });

  describe("PUT /transactions/{transactionId}/tags — set-tags", () => {
    test("forwards tagIds array and refetches transaction", async () => {
      setTransactionTags.mockResolvedValue(undefined as never);
      getTransactionDetail.mockResolvedValue({
        ...validTxnRow,
        id: "10000000-0000-4000-a000-000000000001",
        tagIds: ["30000000-0000-4000-a000-00000000000a", "30000000-0000-4000-a000-00000000000b"],
      });

      const { json, status } = await request(
        transactionsRouter,
        "/transactions/10000000-0000-4000-a000-000000000001/tags",
        {
          body: JSON.stringify({
            tagIds: [
              "30000000-0000-4000-a000-00000000000a",
              "30000000-0000-4000-a000-00000000000b",
            ],
          }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        },
      );
      const body = await json<{ tagIds: string[] }>();

      expect(status).toBe(200);
      expect(setTransactionTags).toHaveBeenCalledWith(
        TEST_USER_ID,
        "10000000-0000-4000-a000-000000000001",
        ["30000000-0000-4000-a000-00000000000a", "30000000-0000-4000-a000-00000000000b"],
      );
      expect(body.tagIds).toStrictEqual([
        "30000000-0000-4000-a000-00000000000a",
        "30000000-0000-4000-a000-00000000000b",
      ]);
    });

    test("404 when post-set refetch throws ApiError 404", async () => {
      // setTransactionTags silently no-ops on unowned/missing rows. Handler
      // re-fetches to surface 404. Catches: handler ignores the refetch
      // failure and returns 200 with stale/empty data.
      setTransactionTags.mockResolvedValue(undefined as never);
      getTransactionDetail.mockRejectedValue(
        new ApiError(404, "transaction_not_found", "Transaction not found"),
      );

      const { status } = await request(
        transactionsRouter,
        "/transactions/10000000-0000-4000-a000-000000000005/tags",
        {
          body: JSON.stringify({ tagIds: [] }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        },
      );

      expect(status).toBe(404);
    });
  });
});
