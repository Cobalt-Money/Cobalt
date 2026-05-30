import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeAccount {
  id: string;
  type?: string | null;
  balance: {
    available: string | null;
    buyingPower: string | null;
    creditLimit: string | null;
    currency: string | null;
    current: string;
  } | null;
}

const findManyMock = vi.fn<(args: unknown) => Promise<FakeAccount[]>>();
const onConflictDoUpdateMock = vi.fn<() => Promise<void>>().mockResolvedValue();
const valuesMock = vi.fn<(rows: Record<string, unknown>[]) => unknown>(() => ({
  onConflictDoUpdate: onConflictDoUpdateMock,
}));
const insertMock = vi.fn(() => ({ values: valuesMock }));

vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        insert: insertMock,
        query: {
          financialAccount: { findMany: findManyMock },
        },
      },
    }) as never,
);

vi.mock(
  import("@cobalt-web/db/schema/accounts/snapshot"),
  () =>
    ({
      snapshot: { accountId: "account_id", snapshotDate: "snapshot_date" },
    }) as never,
);

const { upsertBankBalanceSnapshotsForUser, upsertSnapTradePortfolioSnapshotsForUser } =
  await import("./mutations.js");

function lastInsertRows(): Record<string, unknown>[] {
  const call = valuesMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("no insert recorded");
  }
  return call[0];
}

function resetMocks(): void {
  findManyMock.mockReset();
  valuesMock.mockClear();
  onConflictDoUpdateMock.mockClear();
  insertMock.mockClear();
}

describe("upsertSnapTradePortfolioSnapshotsForUser", () => {
  beforeEach(resetMocks);

  it("computes positionsValue = current - available for each account", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: "8461.5800",
          buyingPower: "8461.5800",
          creditLimit: null,
          currency: "USD",
          current: "89461.5800",
        },
        id: "acct-1",
      },
      {
        balance: {
          available: "4.5300",
          buyingPower: "4.5300",
          creditLimit: null,
          currency: "USD",
          current: "14858.5500",
        },
        id: "acct-2",
      },
    ]);

    const result = await upsertSnapTradePortfolioSnapshotsForUser("user-1");

    expect(result.upserted).toBe(2);
    const rows = lastInsertRows();
    expect(rows[0]).toMatchObject({
      accountId: "acct-1",
      available: "8461.5800",
      current: "89461.5800",
      positionsValue: "81000.0000",
      source: "snaptrade",
    });
    expect(rows[1]).toMatchObject({
      accountId: "acct-2",
      positionsValue: "14854.0200",
      source: "snaptrade",
    });
  });

  it("treats missing available as zero cash so positions = full current", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: null,
          buyingPower: null,
          creditLimit: null,
          currency: "USD",
          current: "1332.7500",
        },
        id: "acct-3",
      },
    ]);

    await upsertSnapTradePortfolioSnapshotsForUser("user-1");

    expect(lastInsertRows()[0]).toMatchObject({
      available: null,
      current: "1332.7500",
      positionsValue: "1332.7500",
    });
  });

  it("skips accounts that have no balance row", async () => {
    findManyMock.mockResolvedValue([{ balance: null, id: "acct-x" }]);

    const result = await upsertSnapTradePortfolioSnapshotsForUser("user-1");

    expect(result.upserted).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("upsertBankBalanceSnapshotsForUser", () => {
  beforeEach(resetMocks);

  it("does not write positionsValue for plaid accounts", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: "100.0000",
          buyingPower: null,
          creditLimit: null,
          currency: "USD",
          current: "150.0000",
        },
        id: "plaid-1",
        type: "depository",
      },
    ]);

    await upsertBankBalanceSnapshotsForUser("user-1");

    expect(lastInsertRows()[0]).toMatchObject({
      accountId: "plaid-1",
      current: "150.0000",
      positionsValue: null,
      source: "plaid",
    });
  });

  it("copies credit balance straight through (already signed at ingestion)", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: null,
          buyingPower: null,
          creditLimit: "-10000.0000",
          currency: "USD",
          current: "-5154.0000",
        },
        id: "credit-1",
        type: "credit",
      },
    ]);

    await upsertBankBalanceSnapshotsForUser("user-1");

    expect(lastInsertRows()[0]).toMatchObject({
      accountId: "credit-1",
      current: "-5154.0000",
    });
  });

  it("copies loan balance straight through (already signed at ingestion)", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: null,
          buyingPower: null,
          creditLimit: null,
          currency: "USD",
          current: "-13545.9600",
        },
        id: "loan-1",
        type: "loan",
      },
    ]);

    await upsertBankBalanceSnapshotsForUser("user-1");

    expect(lastInsertRows()[0]?.current).toBe("-13545.9600");
  });

  it("copies an overpaid credit card as positive (asset) straight through", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: null,
          buyingPower: null,
          creditLimit: "-10000.0000",
          currency: "USD",
          current: "50.0000",
        },
        id: "credit-2",
        type: "credit",
      },
    ]);

    await upsertBankBalanceSnapshotsForUser("user-1");

    expect(lastInsertRows()[0]?.current).toBe("50.0000");
  });

  it("preserves overdrawn checking as negative (asset, sign untouched)", async () => {
    findManyMock.mockResolvedValue([
      {
        balance: {
          available: "-100.0000",
          buyingPower: null,
          creditLimit: null,
          currency: "USD",
          current: "-100.0000",
        },
        id: "checking-1",
        type: "depository",
      },
    ]);

    await upsertBankBalanceSnapshotsForUser("user-1");

    expect(lastInsertRows()[0]?.current).toBe("-100.0000");
  });
});
