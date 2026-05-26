/**
 * `/v1/portfolio/snapshots` — focused on the `snapshotDate` → `date` rename
 * in the handler mapper. Catches: server-data renames the column, handler
 * silently drops it.
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

const getPortfolioSnapshots = vi.fn();

vi.mock(import("@cobalt-web/server-data/brokerage/portfolio-snapshots"), () => ({
  getPortfolioSnapshots: (...args: unknown[]) => getPortfolioSnapshots(...args),
}));

const { portfolioSnapshotsRouter } = await import("../../src/api/public/v1/portfolio-snapshots.js");

describe("v1/portfolio-snapshots", () => {
  beforeEach(() => {
    getPortfolioSnapshots.mockReset();
  });

  describe("GET /portfolio/snapshots", () => {
    test("forwards date range + accountId to data layer", async () => {
      getPortfolioSnapshots.mockResolvedValue([]);

      await request(
        portfolioSnapshotsRouter,
        "/portfolio/snapshots?startDate=2026-01-01&endDate=2026-05-22&accountId=acc_x",
      );

      expect(getPortfolioSnapshots).toHaveBeenCalledWith(TEST_USER_ID, {
        accountId: "acc_x",
        endDate: "2026-05-22",
        startDate: "2026-01-01",
      });
    });

    test("renames server-data `snapshotDate` → public `date`", async () => {
      getPortfolioSnapshots.mockResolvedValue([
        { accountId: "acc_1", id: "snap_1", snapshotDate: "2026-05-22", value: 50_000 },
      ]);

      const { json, status } = await request(portfolioSnapshotsRouter, "/portfolio/snapshots");
      const body = await json<{ date: string; value: number }[]>();

      expect(status).toBe(200);
      expect(body[0]).toStrictEqual({
        accountId: "acc_1",
        date: "2026-05-22",
        id: "snap_1",
        value: 50_000,
      });
    });
  });
});
