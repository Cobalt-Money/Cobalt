/**
 * `/v1/recurring` — focused on the handler's category mapper that injects
 * `excludeFromInsights/groupId/hidden = null` (fields not present on
 * server-data's `recurringTransactionSchema.category`).
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

const getRecurringTransactions = vi.fn();

vi.mock(import("@cobalt-web/server-data/recurring/query"), () => ({
  getRecurringTransactions: (...args: unknown[]) => getRecurringTransactions(...args),
}));

const { recurringRouter } = await import("../../src/api/public/v1/recurring.js");

const validRecurringRow = {
  accountId: "acc_1",
  accountName: "Chase",
  accountSubtype: null,
  accountType: "depository",
  averageAmount: 9.99,
  category: {
    groupName: "Subscriptions",
    groupSystemKey: "subscriptions",
    iconKey: "music",
    id: "cat_spotify",
    name: "Spotify",
    systemKey: "spotify",
  },
  description: "SPOTIFY",
  firstDate: "2025-01-15",
  frequency: "MONTHLY",
  id: "rec_1",
  institutionLogo: null,
  institutionName: null,
  institutionUrl: null,
  isActive: true,
  lastAmount: 9.99,
  lastDate: "2026-05-15",
  merchantName: "Spotify",
  predictedNextDate: "2026-06-15",
  status: "MATURE",
  streamId: "stream_1",
  streamType: "outflow",
  transactionIds: ["tx_1"],
  updatedAt: "2026-05-15T00:00:00Z",
};

describe("v1/recurring", () => {
  beforeEach(() => {
    getRecurringTransactions.mockReset();
  });

  describe("GET /recurring", () => {
    test("category mapper injects nulls for fields not in server-data shape", async () => {
      // server-data's `recurringTransactionSchema.category` has 6 fields.
      // Public `categorySchema` has 9. Handler fills the 3 missing
      // (`excludeFromInsights`, `groupId`, `hidden`) with null. Catches:
      // someone copy-pastes the server-data category through and breaks
      // SDK consumers expecting the public shape.
      getRecurringTransactions.mockResolvedValue([validRecurringRow]);

      const { json, status } = await request(recurringRouter, "/recurring");
      const body = await json<{
        data: { category: Record<string, unknown> | null }[];
      }>();

      expect(status).toBe(200);
      expect(body.data[0]?.category).toStrictEqual({
        excludeFromInsights: null,
        groupId: null,
        hidden: null,
        iconKey: "music",
        id: "cat_spotify",
        name: "Spotify",
        systemKey: "spotify",
      });
    });

    test("category nullable when no category attached", async () => {
      getRecurringTransactions.mockResolvedValue([
        { ...validRecurringRow, category: null, id: "rec_no_cat" },
      ]);

      const { json } = await request(recurringRouter, "/recurring");
      const body = await json<{ data: { id: string; category: unknown }[] }>();

      expect(body.data.find((r) => r.id === "rec_no_cat")?.category).toBeNull();
    });
  });
});
