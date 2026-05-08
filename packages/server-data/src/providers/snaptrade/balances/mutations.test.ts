import type { Account, Balance } from "snaptrade-typescript-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.fn<(ids: string[]) => Promise<Map<string, { id: string; userId: string }>>>();
const onConflictDoUpdateMock = vi.fn<() => Promise<void>>().mockResolvedValue();
const valuesMock = vi.fn<(row: Record<string, unknown>) => unknown>(() => ({
  onConflictDoUpdate: onConflictDoUpdateMock,
}));
const insertMock = vi.fn(() => ({ values: valuesMock }));

vi.mock(import("@cobalt-web/db"), () => ({ db: { insert: insertMock } }) as never);

vi.mock(
  import("@cobalt-web/db/schema/accounts/balance"),
  () => ({ balance: { accountId: "account_id" } }) as never,
);

vi.mock(
  import("../accounts/queries.js"),
  () => ({ lookupFinancialAccountsBySnaptradeIds: lookupMock }) as never,
);

const { upsertAccountBalances } = await import("./mutations.js");

function lastInsertRow(): Record<string, unknown> {
  const call = valuesMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("no insert recorded");
  }
  return call[0];
}

describe("upsertAccountBalances", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    valuesMock.mockClear();
    insertMock.mockClear();
    onConflictDoUpdateMock.mockClear();
    lookupMock.mockResolvedValue(new Map([["snap-acct-1", { id: "fa-1", userId: "user-1" }]]));
  });

  it("uses Account.balance.total.amount as current and Balance.cash as available", async () => {
    const balances: Balance[] = [
      {
        buying_power: 8461.58,
        cash: 8461.58,
        currency: { code: "USD" },
      } as Balance,
    ];
    const details = {
      balance: { total: { amount: 89_461.58, currency: "USD" } },
    } as Account;

    await upsertAccountBalances("snap-acct-1", "user-1", balances, details);

    expect(lastInsertRow()).toMatchObject({
      accountId: "fa-1",
      available: "8461.58",
      buyingPower: "8461.58",
      currency: "USD",
      current: "89461.58",
    });
  });

  it("falls back to cash for current when accountDetails is missing", async () => {
    const balances: Balance[] = [
      { buying_power: 50.5, cash: 50.5, currency: { code: "USD" } } as Balance,
    ];

    await upsertAccountBalances("snap-acct-1", "user-1", balances);

    expect(lastInsertRow()).toMatchObject({
      available: "50.5",
      current: "50.5",
    });
  });

  it("falls back to cash when accountDetails has no total amount", async () => {
    const balances: Balance[] = [
      { buying_power: 12, cash: 12, currency: { code: "USD" } } as Balance,
    ];

    await upsertAccountBalances("snap-acct-1", "user-1", balances, {
      balance: { total: null },
    } as unknown as Account);

    expect(lastInsertRow()).toMatchObject({
      available: "12",
      current: "12",
    });
  });

  it("throws when financial_account lookup fails", async () => {
    lookupMock.mockResolvedValue(new Map());

    await expect(
      upsertAccountBalances("snap-acct-1", "user-1", [
        { buying_power: 0, cash: 1, currency: { code: "USD" } } as Balance,
      ]),
    ).rejects.toThrow(/financial_account not found/);
  });

  it("no-ops on empty balances array", async () => {
    await upsertAccountBalances("snap-acct-1", "user-1", []);
    expect(insertMock).not.toHaveBeenCalled();
    expect(lookupMock).not.toHaveBeenCalled();
  });
});
