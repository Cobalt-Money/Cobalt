/**
 * `/v1/spending` — focused on the `result.spending` → `data.buckets` field
 * rename and forwarding of period/accountType/accountId.
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

const getSpending = vi.fn();

vi.mock(import("@cobalt-web/server-data/spending/query"), () => ({
  getSpending: (...args: unknown[]) => getSpending(...args),
}));

const { spendingRouter } = await import("../../src/api/public/v1/spending.js");

describe("v1/spending", () => {
  beforeEach(() => {
    getSpending.mockReset();
  });

  describe("GET /spending", () => {
    test("forwards period, accountType, accountId as positional args", async () => {
      getSpending.mockResolvedValue({
        averageLabel: "daily",
        averageSpending: 0,
        spending: [],
        totalSpending: 0,
      });

      await request(spendingRouter, "/spending?period=3m&accountType=credit&accountId=acc_x");

      expect(getSpending).toHaveBeenCalledWith(TEST_USER_ID, "3m", "credit", "acc_x");
    });

    test("renames server-data `spending` → public `buckets`", async () => {
      // server-data returns `{ spending: [...] }`. Public envelope is
      // `{ data: { buckets: [...] } }`. Catches: someone forwards the
      // server-data shape unchanged and ships `spending` on the wire.
      getSpending.mockResolvedValue({
        averageLabel: "weekly",
        averageSpending: 100,
        spending: [
          { amount: 50, date: "2026-05-01" },
          { amount: 75, date: "2026-05-08" },
        ],
        totalSpending: 125,
      });

      const { json, status } = await request(spendingRouter, "/spending?period=1m");
      const body = await json<{
        averageLabel: string;
        averageSpending: number;
        buckets: { amount: number; date: string }[];
        totalSpending: number;
      }>();

      expect(status).toBe(200);
      expect(body.buckets).toHaveLength(2);
      expect(body.buckets[0]).toStrictEqual({ amount: 50, date: "2026-05-01" });
      // Confirm no field leak under the old key name.
      expect((body as unknown as { spending?: unknown }).spending).toBeUndefined();
    });
  });
});
