import type { Holding, InvestmentTransaction, Security } from "plaid";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncHoldings, syncInvestmentTransactions } from "./orchestration";
import {
  fetchHoldingsStep,
  fetchInvestmentTransactionsPageStep,
  upsertActivitiesStep,
  upsertPositionsStep,
  upsertSecuritiesStep,
} from "./steps";

vi.mock(import("./steps"), () => ({
  fetchHoldingsStep: vi.fn(),
  fetchInvestmentTransactionsPageStep: vi.fn(),
  upsertActivitiesStep: vi.fn(),
  upsertPositionsStep: vi.fn(),
  upsertSecuritiesStep: vi.fn(),
}));

const mockFetchHoldings = vi.mocked(fetchHoldingsStep);
const mockFetchPage = vi.mocked(fetchInvestmentTransactionsPageStep);
const mockUpsertActivities = vi.mocked(upsertActivitiesStep);
const mockUpsertPositions = vi.mocked(upsertPositionsStep);
const mockUpsertSecurities = vi.mocked(upsertSecuritiesStep);

function fakeSecurity(id: string): Security {
  return { security_id: id } as Security;
}

function fakeHolding(): Holding {
  return {} as Holding;
}

function fakeInvestmentTx(): InvestmentTransaction {
  return {} as InvestmentTransaction;
}

describe("syncHoldings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists holdings and securities when fetch succeeds", async () => {
    mockFetchHoldings.mockResolvedValue({
      data: { holdings: [fakeHolding()], securities: [fakeSecurity("s1")] },
      kind: "ok",
    });

    await syncHoldings("tok");

    expect(mockUpsertSecurities).toHaveBeenCalledOnce();
    expect(mockUpsertPositions).toHaveBeenCalledOnce();
  });

  it("does not persist when fetch is skipped", async () => {
    mockFetchHoldings.mockResolvedValue({
      kind: "skip",
      reason: "NO_INVESTMENT_ACCOUNTS",
    });

    await syncHoldings("tok");

    expect(mockUpsertSecurities).not.toHaveBeenCalled();
    expect(mockUpsertPositions).not.toHaveBeenCalled();
  });
});

describe("syncInvestmentTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("paginates through all pages until total is reached", async () => {
    mockFetchPage
      .mockResolvedValueOnce({
        data: {
          securities: [fakeSecurity("s1")],
          totalAvailable: 2,
          transactions: [fakeInvestmentTx()],
        },
        kind: "ok",
      })
      .mockResolvedValueOnce({
        data: {
          securities: [fakeSecurity("s2")],
          totalAvailable: 2,
          transactions: [fakeInvestmentTx()],
        },
        kind: "ok",
      });

    await syncInvestmentTransactions("tok");

    expect(mockFetchPage).toHaveBeenCalledTimes(2);
    expect(mockUpsertActivities).toHaveBeenCalledTimes(2);
  });

  it("does not re-upsert securities it has already seen across pages", async () => {
    mockFetchPage
      .mockResolvedValueOnce({
        data: {
          securities: [fakeSecurity("s1")],
          totalAvailable: 2,
          transactions: [fakeInvestmentTx()],
        },
        kind: "ok",
      })
      .mockResolvedValueOnce({
        data: {
          securities: [fakeSecurity("s1"), fakeSecurity("s2")],
          totalAvailable: 2,
          transactions: [fakeInvestmentTx()],
        },
        kind: "ok",
      });

    await syncInvestmentTransactions("tok");

    // First page upserts s1. Second page: s1 is already seen so only s2 is upserted.
    expect(mockUpsertSecurities).toHaveBeenCalledTimes(2);
    const firstCall = mockUpsertSecurities.mock.calls[0]?.[0] ?? [];
    const secondCall = mockUpsertSecurities.mock.calls[1]?.[0] ?? [];
    expect(firstCall.map((s) => s.security_id)).toStrictEqual(["s1"]);
    expect(secondCall.map((s) => s.security_id)).toStrictEqual(["s2"]);
  });

  it("exits without persistence when the first page fetch is skipped", async () => {
    mockFetchPage.mockResolvedValueOnce({
      kind: "skip",
      reason: "PRODUCT_NOT_READY",
    });

    await syncInvestmentTransactions("tok");

    expect(mockUpsertSecurities).not.toHaveBeenCalled();
    expect(mockUpsertActivities).not.toHaveBeenCalled();
  });
});
