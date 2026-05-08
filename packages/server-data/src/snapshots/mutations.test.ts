import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeAccount {
  id: string;
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

    const result = await upsertSnapTradePortfolioSnapshotsForUser("user-1", "cron");

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

    await upsertSnapTradePortfolioSnapshotsForUser("user-1", "cron");

    expect(lastInsertRows()[0]).toMatchObject({
      available: null,
      current: "1332.7500",
      positionsValue: "1332.7500",
    });
  });

  it("skips accounts that have no balance row", async () => {
    findManyMock.mockResolvedValue([{ balance: null, id: "acct-x" }]);

    const result = await upsertSnapTradePortfolioSnapshotsForUser("user-1", "cron");

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
      },
    ]);

    await upsertBankBalanceSnapshotsForUser("user-1", "cron");

    expect(lastInsertRows()[0]).toMatchObject({
      accountId: "plaid-1",
      current: "150.0000",
      positionsValue: null,
      source: "plaid",
    });
  });
});
