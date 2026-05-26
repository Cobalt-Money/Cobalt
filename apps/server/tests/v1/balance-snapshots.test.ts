/**
 * `/v1/balances/snapshots` — focused on two handler-local concerns:
 *   1. Post-query `accountId` filter (handler-side, not data-layer)
 *   2. `snapshotDate` → `date` rename
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

const getBalanceSnapshotsByUserId = vi.fn();

vi.mock(import("@cobalt-web/server-data/snapshots/queries"), () => ({
  getBalanceSnapshotsByUserId: (...args: unknown[]) => getBalanceSnapshotsByUserId(...args),
}));

const { balanceSnapshotsRouter } = await import("../../src/api/public/v1/balance-snapshots.js");

const validSnapshotRow = {
  accountId: "acc_chase",
  availableBalance: 100,
  creditLimit: null,
  currentBalance: 1234.56,
  id: "snap_1",
  snapshotDate: "2026-05-22",
};

describe("v1/balance-snapshots", () => {
  beforeEach(() => {
    getBalanceSnapshotsByUserId.mockReset();
  });

  describe("GET /balances/snapshots", () => {
    test("filters by accountId after the data-layer query returns", async () => {
      // Handler bypasses passing accountId to data layer (per comment in
      // source — `accountId` is provider external id internally vs internal
      // id externally). It post-filters. Catches: someone wires accountId
      // through to data layer naively and double-applies.
      getBalanceSnapshotsByUserId.mockResolvedValue([
        validSnapshotRow,
        { ...validSnapshotRow, accountId: "acc_amex", id: "snap_2" },
      ]);

      const { json } = await request(
        balanceSnapshotsRouter,
        "/balances/snapshots?accountId=acc_chase",
      );
      const body = await json<{ accountId: string }[]>();

      expect(body).toHaveLength(1);
      expect(body[0]?.accountId).toBe("acc_chase");
      // Confirm data layer was NOT given the accountId filter.
      expect(getBalanceSnapshotsByUserId).toHaveBeenCalledWith(TEST_USER_ID, {
        endDate: undefined,
        startDate: undefined,
      });
    });

    test("renames `snapshotDate` → `date`", async () => {
      getBalanceSnapshotsByUserId.mockResolvedValue([validSnapshotRow]);

      const { json } = await request(balanceSnapshotsRouter, "/balances/snapshots");
      const body = await json<{ date: string }[]>();

      expect(body[0]?.date).toBe("2026-05-22");
    });
  });
});
