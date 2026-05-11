import { getBankAccounts, getCreditCards } from "@cobalt-web/server-data/accounts/queries";
import { getPortfolioSnapshotsByUserId } from "@cobalt-web/server-data/brokerage/queries";
import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const networthResponseSchema = z.object({
  asOf: z.string().nullable(),
  history: z.array(
    z.object({
      date: z.string(),
      value: z.number(),
    }),
  ),
  totals: z.object({
    assets: z.number(),
    checking: z.number(),
    credit: z.number(),
    investments: z.number(),
    liabilities: z.number(),
    loans: z.number(),
    netWorth: z.number(),
    savings: z.number(),
  }),
});

const querySchema = z.object({
  range: z.enum(["1W", "1M", "1Y", "All"]).optional().default("1Y"),
});

const networthRoute = createRoute({
  description:
    "Aggregated net worth: totals by category (latest snapshot per account) plus a daily history series. Bank assets and liabilities are sourced from `snapshot` (joined with `financial_account.type/subtype`); investments come from portfolio snapshots.",
  method: "get",
  path: "/",
  request: { query: querySchema },
  responses: {
    200: {
      content: { "application/json": { schema: networthResponseSchema } },
      description: "Net worth totals and history",
    },
  },
  summary: "Get net worth",
  tags: ["Net Worth"],
});

function rangeStart(range: "1W" | "1M" | "1Y" | "All"): string | undefined {
  if (range === "All") {
    return;
  }
  const now = new Date();
  let days = 365;
  if (range === "1W") {
    days = 7;
  } else if (range === "1M") {
    days = 30;
  }
  now.setDate(now.getDate() - days);
  return now.toISOString().split("T")[0];
}

interface BankSnap {
  plaidAccountId: string | null;
  accountType: string;
  accountSubtype: string | null;
  currentBalance: number;
  snapshotDate: string;
}

interface PortSnap {
  accountId: string;
  value: number;
  snapshotDate: string;
}

function latestPerAccount<T extends { snapshotDate: string }>(
  snaps: T[],
  keyOf: (s: T) => string | null,
): T[] {
  const latest = new Map<string, T>();
  for (const s of snaps) {
    const k = keyOf(s);
    if (!k) {
      continue;
    }
    const prev = latest.get(k);
    if (!prev || s.snapshotDate > prev.snapshotDate) {
      latest.set(k, s);
    }
  }
  return [...latest.values()];
}

function categorize(s: BankSnap): "checking" | "savings" | "credit" | "loan" | null {
  if (s.accountType === "credit") {
    return "credit";
  }
  if (s.accountType === "loan") {
    return "loan";
  }
  if (s.accountType === "depository") {
    return s.accountSubtype === "savings" ? "savings" : "checking";
  }
  return null;
}

function buildHistory(bank: BankSnap[], port: PortSnap[]): { date: string; value: number }[] {
  const dates = new Set<string>();
  for (const s of bank) {
    dates.add(s.snapshotDate);
  }
  for (const s of port) {
    dates.add(s.snapshotDate);
  }
  const sorted = [...dates].toSorted();

  // Running latest-per-account state walked forward in time.
  const bankByAcct = new Map<string, BankSnap>();
  const portByAcct = new Map<string, PortSnap>();
  const bankByDate = new Map<string, BankSnap[]>();
  const portByDate = new Map<string, PortSnap[]>();
  for (const s of bank) {
    if (!bankByDate.has(s.snapshotDate)) {
      bankByDate.set(s.snapshotDate, []);
    }
    bankByDate.get(s.snapshotDate)?.push(s);
  }
  for (const s of port) {
    if (!portByDate.has(s.snapshotDate)) {
      portByDate.set(s.snapshotDate, []);
    }
    portByDate.get(s.snapshotDate)?.push(s);
  }

  const series: { date: string; value: number }[] = [];
  for (const date of sorted) {
    for (const s of bankByDate.get(date) ?? []) {
      if (s.plaidAccountId) {
        bankByAcct.set(s.plaidAccountId, s);
      }
    }
    for (const s of portByDate.get(date) ?? []) {
      portByAcct.set(s.accountId, s);
    }
    // snapshot.current is signed at write time (liabilities negative); plain
    // sum yields net worth without per-row sign logic.
    let total = 0;
    for (const s of bankByAcct.values()) {
      if (categorize(s)) {
        total += s.currentBalance;
      }
    }
    for (const s of portByAcct.values()) {
      total += s.value;
    }
    series.push({ date, value: total });
  }
  return series;
}

export const networthRouter = new OpenAPIHono<AppEnv>().openapi(networthRoute, async (c) => {
  const userId = c.var.user.id;
  const { range } = c.req.valid("query");
  const startDate = rangeStart(range);

  const [bankRaw, portRaw, bankAccounts, creditAccounts] = await Promise.all([
    getBalanceSnapshotsByUserId(userId, startDate ? { startDate } : {}),
    getPortfolioSnapshotsByUserId(userId, startDate ? { startDate } : {}),
    getBankAccounts(userId),
    getCreditCards(userId),
  ]);

  const bank: BankSnap[] = bankRaw.map((s) => ({
    accountSubtype: s.accountSubtype,
    accountType: s.accountType,
    currentBalance: s.currentBalance,
    plaidAccountId: s.plaidAccountId,
    snapshotDate: s.snapshotDate,
  }));
  const port: PortSnap[] = portRaw.map((s) => ({
    accountId: s.accountId,
    snapshotDate: s.snapshotDate,
    value: s.value,
  }));

  const latestBank = latestPerAccount(bank, (s) => s.plaidAccountId);
  const latestPort = latestPerAccount(port, (s) => s.accountId);

  let checking = 0;
  let savings = 0;
  let credit = 0;
  let loans = 0;
  for (const s of latestBank) {
    const cat = categorize(s);
    if (cat === "checking") {
      checking += s.currentBalance;
    } else if (cat === "savings") {
      savings += s.currentBalance;
    } else if (cat === "credit") {
      credit += s.currentBalance;
    } else if (cat === "loan") {
      loans += s.currentBalance;
    }
  }
  let investments = 0;
  for (const s of latestPort) {
    investments += s.value;
  }

  // snapshot.current is signed (liabilities negative). Net worth = plain sum.
  // Surface credit / loans / liabilities as positive magnitudes for the
  // public API (consumer-friendly "you owe $X" framing).
  const netWorth = checking + savings + investments + credit + loans;
  const assets = checking + savings + investments;
  credit = Math.abs(credit);
  loans = Math.abs(loans);
  const liabilities = credit + loans;

  const history = buildHistory(bank, port);
  const asOf = history.length > 0 ? (history.at(-1)?.date ?? null) : null;

  // Touch account lists so we can also surface "no accounts" → empty totals
  // without needing to special-case here. Future: per-account breakdown.
  void bankAccounts;
  void creditAccounts;

  c.header("Cache-Control", "private, max-age=60");
  return c.json(
    {
      asOf,
      history,
      totals: {
        assets,
        checking,
        credit,
        investments,
        liabilities,
        loans,
        netWorth,
        savings,
      },
    },
    200,
  );
});
