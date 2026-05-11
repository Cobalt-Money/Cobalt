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
import { fmpGetProfile, fmpGetQuote } from "@cobalt-web/server-data/research/fmp-ticker";
import { getResearchNews } from "@cobalt-web/server-data/research/queries";
import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import { balanceSnapshotQuerySchema } from "@cobalt-web/server-data/snapshots/schemas";
import { patchTransaction } from "@cobalt-web/server-data/transactions/mutations";
import { getUserTransactions } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionPatchBodySchema,
  transactionListQuerySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { setTransactionTags } from "@cobalt-web/server-data/transactions/tags/mutations";
import {
  getTag,
  getTagIdsForTransaction,
  listTags,
} from "@cobalt-web/server-data/transactions/tags/queries";
import { z } from "zod";

interface BridgeRoute<S extends z.ZodTypeAny> {
  schema: S;
  handler: (userId: string, args: z.infer<S>) => Promise<unknown>;
}

function defineRoute<S extends z.ZodTypeAny>(r: BridgeRoute<S>): BridgeRoute<S> {
  return r;
}

const emptySchema = z.object({});
const accountIdSchema = z.object({ accountId: z.string().min(1) });
const tagIdSchema = z.object({ tagId: z.string().min(1) });
const txnIdSchema = z.object({ transactionId: z.string().min(1) });
const txnTagIdsSchema = z.object({
  tagIds: z.array(z.uuid()).min(1),
  transactionId: z.string().min(1),
});
const transactionPatchSchema = z.object({
  patch: transactionPatchBodySchema,
  transactionId: z.string().min(1),
});
const symbolSchema = z.object({ symbol: z.string().min(1) });

/**
 * Registry of routes the sandbox is allowed to call through the bridge.
 *
 * Each entry pairs a Zod input schema with a handler that already enforces the
 * caller's userId scope at the data layer (research routes are global market
 * data and ignore userId). Adding a new entry here automatically exposes it on
 * `/api/agent-bridge/exec`; the SDK shim in `mcp/services/cobalt-sdk-shim.ts`
 * must be updated in lockstep so the LLM can discover it.
 */
export const BRIDGE_ROUTES = {
  "accounts.getById": defineRoute({
    handler: async (userId, { accountId }) => ({
      account: await getBankAccountById(userId, accountId),
    }),
    schema: accountIdSchema,
  }),
  "accounts.listAll": defineRoute({
    handler: async (userId) => ({
      accounts: await getAllAccountsWithInstitutions(userId),
    }),
    schema: emptySchema,
  }),
  "accounts.listBank": defineRoute({
    handler: async (userId) => ({ accounts: await getBankAccounts(userId) }),
    schema: emptySchema,
  }),
  "accounts.listCreditCards": defineRoute({
    handler: async (userId) => ({ accounts: await getCreditCards(userId) }),
    schema: emptySchema,
  }),
  "brokerage.accounts": defineRoute({
    handler: async (userId) => ({
      accounts: await getBrokerageAccountsByUserId(userId),
    }),
    schema: emptySchema,
  }),
  "brokerage.activities": defineRoute({
    handler: async (userId, args) => await getActivitiesByUserId(userId, args),
    schema: activitiesQuerySchema,
  }),
  "brokerage.balances": defineRoute({
    handler: async (userId) => await getBalancesByUserId(userId),
    schema: emptySchema,
  }),
  "brokerage.portfolioSnapshots": defineRoute({
    handler: async (userId, args) => await getPortfolioSnapshotsByUserId(userId, args),
    schema: portfolioSnapshotsQuerySchema,
  }),
  "brokerage.positions": defineRoute({
    handler: async (userId, args) => await getPositionsByUserId(userId, args),
    schema: positionsQuerySchema,
  }),
  "brokerage.userBrokerages": defineRoute({
    handler: async (userId) => ({
      brokerages: await getUserBrokeragesByUserId(userId),
    }),
    schema: emptySchema,
  }),
  "brokerage.userTickers": defineRoute({
    handler: async (userId) => ({
      tickers: await getUserTickersByUserId(userId),
    }),
    schema: emptySchema,
  }),
  "research.news": defineRoute({
    handler: async (_userId, { symbol }) => await getResearchNews(symbol),
    schema: symbolSchema,
  }),
  "research.overview": defineRoute({
    handler: async (_userId, { symbol }) => await fmpGetProfile(symbol),
    schema: symbolSchema,
  }),
  "research.quote": defineRoute({
    handler: async (_userId, { symbol }) => await fmpGetQuote(symbol),
    schema: symbolSchema,
  }),
  "snapshots.balances": defineRoute({
    handler: async (userId, args) => ({
      snapshots: await getBalanceSnapshotsByUserId(userId, args),
    }),
    schema: balanceSnapshotQuerySchema,
  }),
  "tags.addToTransaction": defineRoute({
    handler: async (userId, { tagIds, transactionId }) => {
      const existing = await getTagIdsForTransaction(userId, transactionId);
      const merged = [...new Set([...existing, ...tagIds])];
      await setTransactionTags(userId, transactionId, merged);
      return { tagIds: merged };
    },
    schema: txnTagIdsSchema,
  }),
  "tags.forTransaction": defineRoute({
    handler: async (userId, { transactionId }) => ({
      tagIds: await getTagIdsForTransaction(userId, transactionId),
    }),
    schema: txnIdSchema,
  }),
  "tags.get": defineRoute({
    handler: async (userId, { tagId }) => ({
      tag: await getTag(userId, tagId),
    }),
    schema: tagIdSchema,
  }),
  "tags.list": defineRoute({
    handler: async (userId) => ({ tags: await listTags(userId) }),
    schema: emptySchema,
  }),
  "tags.removeFromTransaction": defineRoute({
    handler: async (userId, { tagIds, transactionId }) => {
      const existing = await getTagIdsForTransaction(userId, transactionId);
      const drop = new Set(tagIds);
      const next = existing.filter((id) => !drop.has(id));
      await setTransactionTags(userId, transactionId, next);
      return { tagIds: next };
    },
    schema: txnTagIdsSchema,
  }),
  "tags.setOnTransaction": defineRoute({
    handler: async (userId, { tagIds, transactionId }) => {
      await setTransactionTags(userId, transactionId, tagIds);
      return { tagIds };
    },
    schema: z.object({
      tagIds: z.array(z.uuid()),
      transactionId: z.string().min(1),
    }),
  }),
  "transactions.list": defineRoute({
    handler: (userId, args) => getUserTransactions(userId, args),
    schema: transactionListQuerySchema,
  }),
  "transactions.update": defineRoute({
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
    schema: transactionPatchSchema,
  }),
} as const;

export type BridgeRouteName = keyof typeof BRIDGE_ROUTES;

export function isBridgeRoute(name: string): name is BridgeRouteName {
  return Object.hasOwn(BRIDGE_ROUTES, name);
}
