import { bindRoutes, route } from "@cobalt-web/bindings";
import type { Binding, RouteSpec } from "@cobalt-web/bindings";
import { db } from "@cobalt-web/db";
import { getBankAccountById, listAccounts } from "@cobalt-web/server-data/accounts/queries";
import { accountListQuerySchema } from "@cobalt-web/server-data/accounts/schemas";
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
import { symbolQuerySchema } from "@cobalt-web/server-data/research/schemas";
import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import { balanceSnapshotQuerySchema } from "@cobalt-web/server-data/snapshots/schemas";
import { patchTransaction } from "@cobalt-web/server-data/transactions/mutations";
import { getUserTransactions } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionListQuerySchema,
  transactionPatchBodySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import {
  createTag,
  setTransactionTags,
  updateTag,
} from "@cobalt-web/server-data/transactions/tags/mutations";
import {
  getTag,
  getTagIdsForTransaction,
  listTags,
} from "@cobalt-web/server-data/transactions/tags/queries";
import {
  createTagBodySchema,
  updateTagBodySchema,
} from "@cobalt-web/server-data/transactions/tags/schemas";
import { z } from "zod";

export type { Binding };

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
const tagUpdateSchema = z.object({
  patch: updateTagBodySchema,
  tagId: z.string().min(1),
});

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
    description:
      "List the user's accounts with institution metadata. Filter by Plaid `type` and/or `subtype`. SnapTrade brokerage data is under `brokerage_accounts`.",
    handler: async (userId, params) => ({ accounts: await listAccounts(userId, params) }),
    name: "accounts_list",
    schema: accountListQuerySchema,
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
    handler: async (userId, args) => await getPortfolioSnapshotsByUserId(userId, args),
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
    description: "Public market data: news articles for a symbol.",
    handler: async (_userId, { symbol }) => await getResearchNews(symbol),
    name: "research_news",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: normalized company profile (FMP).",
    handler: async (_userId, { symbol }) => await fmpGetProfile(symbol),
    name: "research_overview",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: latest quote for a symbol (FMP).",
    handler: async (_userId, { symbol }) => await fmpGetQuote(symbol),
    name: "research_quote",
    schema: symbolQuerySchema,
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
    handler: (userId, args) => getUserTransactions(userId, args),
    name: "transactions_list",
    schema: transactionListQuerySchema,
  }),
  route({
    description: "Patch a transaction the user owns (mutation). Verifies ownership first.",
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
  route({
    description: "Create a new tag owned by the user. Returns the created tag id.",
    handler: async (userId, body) => await createTag(userId, body),
    name: "tags_create",
    schema: createTagBodySchema,
  }),
  route({
    description:
      "Update a tag the user owns: rename, recolor, or archive. `archived: true` is the soft-delete equivalent (tag is hidden from picker but historical assignments remain).",
    handler: async (userId, { patch, tagId }) => {
      await updateTag(userId, tagId, patch);
      return { ok: true };
    },
    name: "tags_update",
    schema: tagUpdateSchema,
  }),
];

export function buildBindings(userId: string): Binding[] {
  return bindRoutes(userId, ROUTES);
}
