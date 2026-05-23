import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeRow {
  accountId: string;
  current: string;
  id: string;
  positionsValue: string | null;
  snapshotDate: Date | string;
}

const findManyMock = vi.fn<(args: unknown) => Promise<FakeRow[]>>();

vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        query: {
          snapshot: { findMany: findManyMock },
        },
      },
    }) as never,
);

vi.mock(import("@cobalt-web/db/schema/accounts/account"), () => ({}) as never);
vi.mock(import("@cobalt-web/db/schema/accounts/investments/holding"), () => ({}) as never);
vi.mock(import("@cobalt-web/db/schema/accounts/investments/security"), () => ({}) as never);

const { getPortfolioSnapshots } = await import("./queries.js");

function lastWhere(): Record<string, unknown> {
  const call = findManyMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("findMany not called");
  }
  return (call[0] as { where: Record<string, unknown> }).where;
}

describe("getPortfolioSnapshots", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([]);
  });

  it("scopes to userId", async () => {
    await getPortfolioSnapshots("user-1", {});
    expect(lastWhere().userId).toStrictEqual({ eq: "user-1" });
  });

  it("filters via account relation: snaptrade OR (plaid + investment) OR (manual + investment)", async () => {
    await getPortfolioSnapshots("user-1", {});
    const where = lastWhere();
    expect(where.account).toStrictEqual({
      OR: [
        { source: { eq: "snaptrade" } },
        { AND: [{ source: { eq: "plaid" } }, { type: { eq: "investment" } }] },
        { AND: [{ source: { eq: "manual" } }, { type: { eq: "investment" } }] },
      ],
    });
  });

  it("applies date range from params", async () => {
    await getPortfolioSnapshots("user-1", {
      endDate: "2026-05-10",
      startDate: "2026-05-01",
    });
    expect(lastWhere().snapshotDate).toStrictEqual({ gte: "2026-05-01", lte: "2026-05-10" });
  });

  it("scopes to a specific accountId when provided", async () => {
    await getPortfolioSnapshots("user-1", { accountId: "acct-9" });
    expect(lastWhere().accountId).toStrictEqual({ eq: "acct-9" });
  });

  it("ignores accountId='all-accounts' sentinel", async () => {
    await getPortfolioSnapshots("user-1", { accountId: "all-accounts" });
    expect(lastWhere().accountId).toBeUndefined();
  });

  it("returns single value from current — no client math", async () => {
    findManyMock.mockResolvedValue([
      {
        accountId: "acct-1",
        current: "1000.00",
        id: "snap-1",
        positionsValue: "750.00",
        snapshotDate: "2026-05-09",
      },
    ]);

    const rows = await getPortfolioSnapshots("user-1", {});

    expect(rows).toStrictEqual([
      {
        accountId: "acct-1",
        id: "snap-1",
        snapshotDate: "2026-05-09",
        value: 1000,
      },
    ]);
  });

  it("normalizes Date snapshotDate to YYYY-MM-DD string", async () => {
    findManyMock.mockResolvedValue([
      {
        accountId: "acct-2",
        current: "5000.00",
        id: "snap-2",
        positionsValue: null,
        snapshotDate: new Date("2026-05-09T00:00:00Z"),
      },
    ]);

    const rows = await getPortfolioSnapshots("user-1", {});

    expect(rows[0]).toMatchObject({ snapshotDate: "2026-05-09", value: 5000 });
  });
});
