/**
 * `/v1/positions` — high-value coverage focused on the schema's
 * `.transform().pipe()` pipeline that does string→number coercion and
 * computes `marketValue = units × price`. That pipeline is the only place
 * provider-shape drift can silently corrupt SDK consumer numbers.
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

const getPositions = vi.fn();

vi.mock(import("@cobalt-web/server-data/brokerage/positions"), () => ({
  getPositions: (...args: unknown[]) => getPositions(...args),
}));

const { positionsRouter } = await import("../../src/api/public/v1/positions.js");

const validPositionRow = {
  accountId: "acc_1",
  averagePurchasePrice: "100.50",
  currencyCode: "USD",
  id: "pos_1",
  openPnl: "12.34",
  price: "150.25",
  symbol: "AAPL",
  symbolDescription: "Apple Inc.",
  units: "10",
};

describe("v1/positions", () => {
  beforeEach(() => {
    getPositions.mockReset();
  });

  describe("GET /positions", () => {
    test("forwards accountId filter to data layer", async () => {
      getPositions.mockResolvedValue({ positions: [], positionsByAccount: {} });

      await request(positionsRouter, "/positions?accountId=acc_xyz");

      expect(getPositions).toHaveBeenCalledWith(TEST_USER_ID, { accountId: "acc_xyz" });
    });

    test("coerces provider string fields to numbers and computes marketValue = units × price", async () => {
      // Provider returns numeric fields as decimal strings. `num()` in
      // schemas.ts must coerce; pipe must compute marketValue. Catches: a
      // refactor that drops the .transform() pipe and ships raw strings on
      // the wire — would break SDK consumers' arithmetic silently.
      getPositions.mockResolvedValue({
        positions: [validPositionRow],
        positionsByAccount: {},
      });

      const { json, status } = await request(positionsRouter, "/positions");
      const body = await json<
        {
          averagePrice: number | null;
          marketValue: number | null;
          openPnl: number | null;
          price: number | null;
          units: number | null;
        }[]
      >();

      expect(status).toBe(200);
      expect(body[0]).toMatchObject({
        averagePrice: 100.5,
        marketValue: 10 * 150.25,
        openPnl: 12.34,
        price: 150.25,
        units: 10,
      });
    });

    test("nulls marketValue when units or price is missing/invalid", async () => {
      // Edge: provider sends "" or omits price for unquoted holdings.
      // `num()` returns null; computed marketValue must propagate null
      // instead of NaN/0/string.
      getPositions.mockResolvedValue({
        positions: [
          { ...validPositionRow, id: "pos_no_price", price: null },
          { ...validPositionRow, id: "pos_empty_units", units: "" },
        ],
        positionsByAccount: {},
      });

      const { json } = await request(positionsRouter, "/positions");
      const body = await json<{ id: string; marketValue: number | null }[]>();

      expect(body.find((p) => p.id === "pos_no_price")?.marketValue).toBeNull();
      expect(body.find((p) => p.id === "pos_empty_units")?.marketValue).toBeNull();
    });
  });
});
