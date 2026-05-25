/**
 * `/v1/activities` — focused on the local `num()` coercion in the handler
 * and the `symbol` type cast that defends against server-data declaring
 * `symbol: z.unknown()`.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

import { request, TEST_USER_ID } from "./_helpers/test-app";

vi.mock(import("../../src/api/public/v1/middleware/require-api-key.js"), () => ({
  requireApiKey: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: TEST_USER_ID });
    c.set("zeroContext", { userId: TEST_USER_ID });
    await next();
  },
}));

const getActivities = vi.fn();

vi.mock(import("@cobalt-web/server-data/brokerage/activities"), () => ({
  getActivities: (...args: unknown[]) => getActivities(...args),
}));

const { activitiesRouter } = await import("../../src/api/public/v1/activities.js");

const validActivityRow = {
  accountId: "acc_1",
  amount: "100.00",
  currencyCode: "USD",
  description: "Buy AAPL",
  fee: "0.50",
  id: "act_1",
  price: "150.25",
  settlementDate: "2026-05-22",
  symbol: "AAPL",
  tradeDate: "2026-05-20",
  type: "BUY",
  units: "10",
};

describe("v1/activities", () => {
  beforeEach(() => {
    getActivities.mockReset();
  });

  describe("GET /activities", () => {
    test("forwards accountId + limit + offset to data layer", async () => {
      getActivities.mockResolvedValue({ activities: [], activitiesByAccount: {} });

      await request(activitiesRouter, "/activities?accountId=acc_xyz&limit=50&offset=100");

      expect(getActivities).toHaveBeenCalledWith(TEST_USER_ID, {
        accountId: "acc_xyz",
        limit: 50,
        offset: 100,
      });
    });

    test("coerces numeric string fields and accepts non-string symbol as null", async () => {
      // server-data's `activityItemSchema` declares `symbol: z.unknown()`.
      // Handler defensively coerces non-string to null so SDK consumers
      // always see `string | null`. Catches: someone drops the typeof check
      // and ships e.g. `{ ticker: "AAPL" }` objects to consumers.
      getActivities.mockResolvedValue({
        activities: [
          validActivityRow,
          { ...validActivityRow, id: "act_obj_symbol", symbol: { ticker: "AAPL" } },
        ],
        activitiesByAccount: {},
      });

      const { json, status } = await request(activitiesRouter, "/activities");
      const body = await json<{
        data: { id: string; amount: number; fee: number; symbol: string | null }[];
      }>();

      expect(status).toBe(200);
      expect(body.data[0]).toMatchObject({ amount: 100, fee: 0.5, symbol: "AAPL" });
      expect(body.data.find((a) => a.id === "act_obj_symbol")?.symbol).toBeNull();
    });
  });
});
