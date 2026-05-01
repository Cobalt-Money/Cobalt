import { db } from "@cobalt-web/db";
import {
  getAllAccountsWithInstitutions,
  getBankAccountById,
  getBankAccounts,
  getCreditCards,
} from "@cobalt-web/server-data/accounts/queries";
import {
  getActivitiesByUserId,
  getBalancesByUserId,
  getBrokerageAccountsByUserId,
  getPortfolioSnapshotsByUserId,
  getPositionsByUserId,
  getUserBrokeragesByUserId,
  getUserTickersByUserId,
} from "@cobalt-web/server-data/brokerage/queries";
import {
  activitiesQuerySchema,
  portfolioSnapshotsQuerySchema,
  positionsQuerySchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import {
  getBalanceSheet,
  getCompanyOverview,
  getEarningsEstimates,
  getEarningsHistory,
  getIncomeStatement,
  getIntradayData,
  getQuoteData,
  getResearchNews,
  getTimeSeriesData,
} from "@cobalt-web/server-data/research/queries";
import {
  intradayQuerySchema,
  symbolQuerySchema,
  timeSeriesQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import { balanceSnapshotQuerySchema } from "@cobalt-web/server-data/snapshots/schemas";
import { setTransactionTags } from "@cobalt-web/server-data/tags/mutations";
import {
  getTag,
  getTagIdsForTransaction,
  listTags,
} from "@cobalt-web/server-data/tags/queries";
import { patchTransaction } from "@cobalt-web/server-data/transactions/mutations";
import { getUserTransactions } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionListQuerySchema,
  transactionPatchBodySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { z } from "zod";

export interface Binding {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown) => Promise<unknown>;
}

const toJsonSchema = (s: z.ZodTypeAny): Record<string, unknown> =>
  z.toJSONSchema(s, { target: "draft-7" }) as Record<string, unknown>;

const emptySchema = z.object({});
const accountIdSchema = z.object({ accountId: z.string().min(1) });
const tagIdSchema = z.object({ tagId: z.string().min(1) });
const txnIdSchema = z.object({ transactionId: z.string().min(1) });
const txnTagIdsSchema = z.object({
  tagIds: z.array(z.uuid()).min(1),
  transactionId: z.string().min(1),
});
const txnSetTagsSchema = z.object({
  tagIds: z.array(z.uuid()),
  transactionId: z.string().min(1),
});
const transactionPatchSchema = z.object({
  patch: transactionPatchBodySchema,
  transactionId: z.string().min(1),
});

interface RouteSpec<S extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: S;
  handler: (userId: string, args: z.infer<S>) => Promise<unknown>;
}

function route<S extends z.ZodTypeAny>(spec: RouteSpec<S>): RouteSpec<S> {
  return spec;
}

/**
 * One entry per allowed call. Names use `<group>_<method>` so they survive
 * Isolate global injection (no dots). The runtime wraps these into a
 * `cobalt.<group>.<method>` namespace inside the isolate.
 *
 * `userId` is captured in closure on `buildBindings` — sandbox code cannot
 * supply or override it. Research routes ignore userId (global market data).
 */
const ROUTES: RouteSpec<z.ZodTypeAny>[] = [
  route({
    description: "Get a single bank account by id (user-scoped).",
    handler: async (userId, { accountId }) => ({
      account: await getBankAccountById(userId, accountId),
    }),
    name: "accounts_getById",
    schema: accountIdSchema,
  }),
  route({
    description: "List all accounts with institution metadata for the user.",
    handler: async (userId) => ({
      accounts: await getAllAccountsWithInstitutions(userId),
    }),
    name: "accounts_listAll",
    schema: emptySchema,
  }),
  route({
    description: "List the user's bank accounts.",
    handler: async (userId) => ({ accounts: await getBankAccounts(userId) }),
    name: "accounts_listBank",
    schema: emptySchema,
  }),
  route({
    description: "List the user's credit-card accounts.",
    handler: async (userId) => ({ accounts: await getCreditCards(userId) }),
    name: "accounts_listCreditCards",
    schema: emptySchema,
  }),
  route({
    description: "List the user's brokerage accounts.",
    handler: async (userId) => ({
      accounts: await getBrokerageAccountsByUserId(userId),
    }),
    name: "brokerage_accounts",
    schema: emptySchema,
  }),
  route({
    description: "List brokerage activities (paginated, user-scoped).",
    handler: async (userId, args) => await getActivitiesByUserId(userId, args),
    name: "brokerage_activities",
    schema: activitiesQuerySchema,
  }),
  route({
    description: "Get current brokerage balances for the user.",
    handler: async (userId) => await getBalancesByUserId(userId),
    name: "brokerage_balances",
    schema: emptySchema,
  }),
  route({
    description: "Portfolio value snapshots over time (user-scoped).",
    handler: async (userId, args) =>
      await getPortfolioSnapshotsByUserId(userId, args),
    name: "brokerage_portfolioSnapshots",
    schema: portfolioSnapshotsQuerySchema,
  }),
  route({
    description: "List brokerage positions (paginated, user-scoped).",
    handler: async (userId, args) => await getPositionsByUserId(userId, args),
    name: "brokerage_positions",
    schema: positionsQuerySchema,
  }),
  route({
    description: "List the user's connected brokerages.",
    handler: async (userId) => ({
      brokerages: await getUserBrokeragesByUserId(userId),
    }),
    name: "brokerage_userBrokerages",
    schema: emptySchema,
  }),
  route({
    description: "List tickers held by the user.",
    handler: async (userId) => ({
      tickers: await getUserTickersByUserId(userId),
    }),
    name: "brokerage_userTickers",
    schema: emptySchema,
  }),
  route({
    description: "Public market data: balance sheet for a symbol.",
    handler: async (_userId, { symbol }) => await getBalanceSheet(symbol),
    name: "research_balanceSheet",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: earnings estimates for a symbol.",
    handler: async (_userId, { symbol }) => await getEarningsEstimates(symbol),
    name: "research_earningsEstimates",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: earnings history for a symbol.",
    handler: async (_userId, { symbol }) => await getEarningsHistory(symbol),
    name: "research_earningsHistory",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: income statement for a symbol.",
    handler: async (_userId, { symbol }) => await getIncomeStatement(symbol),
    name: "research_incomeStatement",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: intraday OHLCV bars for a symbol.",
    handler: async (_userId, args) => await getIntradayData(args),
    name: "research_intraday",
    schema: intradayQuerySchema,
  }),
  route({
    description: "Public market data: news articles for a symbol.",
    handler: async (_userId, { symbol }) => await getResearchNews(symbol),
    name: "research_news",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: company overview for a symbol.",
    handler: async (_userId, { symbol }) => await getCompanyOverview(symbol),
    name: "research_overview",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: latest quote for a symbol.",
    handler: async (_userId, { symbol }) => await getQuoteData(symbol),
    name: "research_quote",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: daily/weekly/monthly OHLCV time series.",
    handler: async (_userId, args) => await getTimeSeriesData(args),
    name: "research_timeSeries",
    schema: timeSeriesQuerySchema,
  }),
  route({
    description: "Daily balance snapshots for the user's accounts.",
    handler: async (userId, args) => ({
      snapshots: await getBalanceSnapshotsByUserId(userId, args),
    }),
    name: "snapshots_balances",
    schema: balanceSnapshotQuerySchema,
  }),
  route({
    description: "Add tags to a transaction (idempotent merge).",
    handler: async (userId, { tagIds, transactionId }) => {
      const existing = await getTagIdsForTransaction(userId, transactionId);
      const merged = [...new Set([...existing, ...tagIds])];
      await setTransactionTags(userId, transactionId, merged);
      return { tagIds: merged };
    },
    name: "tags_addToTransaction",
    schema: txnTagIdsSchema,
  }),
  route({
    description: "Get tag ids attached to a transaction.",
    handler: async (userId, { transactionId }) => ({
      tagIds: await getTagIdsForTransaction(userId, transactionId),
    }),
    name: "tags_forTransaction",
    schema: txnIdSchema,
  }),
  route({
    description: "Get a single tag by id (user-scoped).",
    handler: async (userId, { tagId }) => ({
      tag: await getTag(userId, tagId),
    }),
    name: "tags_get",
    schema: tagIdSchema,
  }),
  route({
    description: "List the user's tags.",
    handler: async (userId) => ({ tags: await listTags(userId) }),
    name: "tags_list",
    schema: emptySchema,
  }),
  route({
    description: "Remove tags from a transaction.",
    handler: async (userId, { tagIds, transactionId }) => {
      const existing = await getTagIdsForTransaction(userId, transactionId);
      const drop = new Set(tagIds);
      const next = existing.filter((id) => !drop.has(id));
      await setTransactionTags(userId, transactionId, next);
      return { tagIds: next };
    },
    name: "tags_removeFromTransaction",
    schema: txnTagIdsSchema,
  }),
  route({
    description: "Replace the full tag list on a transaction.",
    handler: async (userId, { tagIds, transactionId }) => {
      await setTransactionTags(userId, transactionId, tagIds);
      return { tagIds };
    },
    name: "tags_setOnTransaction",
    schema: txnSetTagsSchema,
  }),
  route({
    description: "List the user's transactions (paginated, filterable).",
    handler: async (userId, args) => ({
      transactions: await getUserTransactions(userId, args),
    }),
    name: "transactions_list",
    schema: transactionListQuerySchema,
  }),
  route({
    description:
      "Patch a transaction the user owns (mutation). Verifies ownership first.",
    handler: async (userId, { patch, transactionId }) => {
      const owner = await db.query.transaction.findFirst({
        columns: { id: true },
        where: { id: { eq: transactionId }, userId: { eq: userId } },
      });
      if (!owner) {
        throw new Error("transaction not found or not owned by user");
      }
      await patchTransaction(transactionId, userId, patch);
      return { ok: true };
    },
    name: "transactions_update",
    schema: transactionPatchSchema,
  }),
];

export function buildBindings(userId: string): Binding[] {
  return ROUTES.map((r) => ({
    description: r.description,
    handler: async (args: unknown) => {
      const parsed = r.schema.parse(args ?? {});
      return await r.handler(userId, parsed);
    },
    inputSchema: toJsonSchema(r.schema),
    name: r.name,
  }));
}
