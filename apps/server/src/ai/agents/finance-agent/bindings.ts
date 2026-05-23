import { bindRoutes, route } from "@cobalt-web/bindings";
import type { Binding, RouteSpec } from "@cobalt-web/bindings";
import { getAccountDetail } from "@cobalt-web/server-data/accounts/detail";
import { getAccounts, getAccountsSchema } from "@cobalt-web/server-data/accounts/list";
import {
  createManualAccount,
  createManualAccountSchema,
} from "@cobalt-web/server-data/accounts/manual/create";
import {
  getActivities,
  getBalances,
  getBrokerageAccounts,
  getPortfolioSnapshots,
  getPositions,
  getUserBrokerages,
  getUserTickers,
} from "@cobalt-web/server-data/brokerage/queries";
import {
  activitiesQuerySchema,
  portfolioSnapshotsQuerySchema,
  positionsQuerySchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import { getProfile } from "@cobalt-web/server-data/research/overview";
import { getQuote } from "@cobalt-web/server-data/research/quote";
import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { getCategoryDetail } from "@cobalt-web/server-data/categories/detail";
import { getCategories } from "@cobalt-web/server-data/categories/list";
import { getResearchNews } from "@cobalt-web/server-data/research/news";
import { symbolQuerySchema } from "@cobalt-web/server-data/research/_shared";
import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import { balanceSnapshotQuerySchema } from "@cobalt-web/server-data/snapshots/schemas";
import {
  createManualTransactions,
  patchTransaction,
} from "@cobalt-web/server-data/transactions/mutations";
import { getTransactions } from "@cobalt-web/server-data/transactions/queries";
import {
  createTransactionSchema,
  getTransactionsSchema,
  patchTransactionSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import {
  createTag,
  setTransactionTags,
  updateTag,
} from "@cobalt-web/server-data/transactions/tags/mutations";
import {
  getTag,
  getTagsForTransaction,
  listTags,
} from "@cobalt-web/server-data/transactions/tags/queries";
import { createTagSchema, patchTagSchema } from "@cobalt-web/server-data/transactions/tags/schemas";
import { z } from "zod";

export type { Binding };

const emptySchema = z.object({});
const accountIdSchema = z.object({ accountId: z.string().min(1) });
const categoryIdSchema = z.object({ categoryId: z.string().min(1) });
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
  patch: patchTransactionSchema,
  transactionId: z.string().min(1),
});
const tagUpdateSchema = z.object({
  patch: patchTagSchema,
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
    description:
      "Get a single account by its internal `id` (the same id returned by `accounts.list`). Works for any source.",
    handler: async (userId, { accountId }) => ({
      account: await getAccountDetail(userId, accountId),
    }),
    name: "accounts_getById",
    schema: accountIdSchema,
  }),
  route({
    description:
      "List the user's accounts. Each row exposes the internal `id` — use it as `accountId` for `transactions.create`. Filter by `type` and/or `subtype` (both optional, AND-combined).",
    handler: async (userId, params) => ({
      accounts: await getAccounts(userId, params),
    }),
    name: "accounts_list",
    schema: getAccountsSchema,
  }),
  route({
    description:
      'Create a new MANUAL financial account for the user (depository, credit, investment, or loan). Server stamps `source: "manual"` and seeds today\'s balance snapshot. Use the returned `id` as `accountId` for `transactions.create`. `currentBalance` is the opening balance; `creditLimit` only valid when `type === "credit"`. `logoDomain` is a Brandfetch domain (e.g. "chase.com") for the lettermark fallback.',
    handler: async (userId, body) => await createManualAccount(userId, body),
    name: "accounts_create",
    schema: createManualAccountSchema,
  }),
  route({
    description: "List the user's brokerage accounts.",
    handler: async (userId) => ({
      accounts: await getBrokerageAccounts(userId),
    }),
    name: "brokerage_accounts",
    schema: emptySchema,
  }),
  route({
    description: "List brokerage activities (paginated, user-scoped).",
    handler: async (userId, args) => await getActivities(userId, args),
    name: "brokerage_activities",
    schema: activitiesQuerySchema,
  }),
  route({
    description: "Get current brokerage balances for the user.",
    handler: async (userId) => await getBalances(userId),
    name: "brokerage_balances",
    schema: emptySchema,
  }),
  route({
    description: "Portfolio value snapshots over time (user-scoped).",
    handler: async (userId, args) => await getPortfolioSnapshots(userId, args),
    name: "brokerage_portfolioSnapshots",
    schema: portfolioSnapshotsQuerySchema,
  }),
  route({
    description: "List brokerage positions (paginated, user-scoped).",
    handler: async (userId, args) => await getPositions(userId, args),
    name: "brokerage_positions",
    schema: positionsQuerySchema,
  }),
  route({
    description: "List the user's connected brokerages.",
    handler: async (userId) => ({
      brokerages: await getUserBrokerages(userId),
    }),
    name: "brokerage_userBrokerages",
    schema: emptySchema,
  }),
  route({
    description: "List tickers held by the user.",
    handler: async (userId) => ({
      tickers: await getUserTickers(userId),
    }),
    name: "brokerage_userTickers",
    schema: emptySchema,
  }),
  route({
    description: "Get a single category by id (user-scoped). Returns null if not found.",
    handler: async (userId, { categoryId }) => {
      try {
        return { category: await getCategoryDetail(userId, categoryId) };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { category: null };
        }
        throw error;
      }
    },
    name: "categories_get",
    schema: categoryIdSchema,
  }),
  route({
    description:
      "List the user's categories with their parent groups. Each category has { id, name, systemKey, groupId, iconKey, hidden, excludeFromInsights }. Use this to resolve a `categoryId` for `transactions.create`/`transactions.update` — match by `name` or `systemKey` (stable across users).",
    handler: async (userId) => await getCategories(userId),
    name: "categories_list",
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
    handler: async (_userId, { symbol }) => await getProfile(symbol),
    name: "research_overview",
    schema: symbolQuerySchema,
  }),
  route({
    description: "Public market data: latest quote for a symbol (FMP).",
    handler: async (_userId, { symbol }) => await getQuote(symbol),
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
      const existing = await getTagsForTransaction(userId, transactionId);
      const merged = [...new Set([...existing.map((t) => t.id), ...tagIds])];
      await setTransactionTags(userId, transactionId, merged);
      return { tagIds: merged };
    },
    name: "tags_addToTransaction",
    schema: txnTagIdsSchema,
  }),
  route({
    description: "Get tags attached to a transaction.",
    handler: async (userId, { transactionId }) => ({
      tags: await getTagsForTransaction(userId, transactionId),
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
      const existing = await getTagsForTransaction(userId, transactionId);
      const drop = new Set(tagIds);
      const next = existing.map((t) => t.id).filter((id) => !drop.has(id));
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
    handler: (userId, args) => getTransactions(userId, args),
    name: "transactions_list",
    schema: getTransactionsSchema,
  }),
  route({
    description:
      'Create manual transactions on user-owned manual accounts. Input is always an array (1–500 rows; pass `[body]` for a single insert). Returns `{ ids: [...] }` in input order. All-or-nothing: any unowned / non-manual account rejects the whole call. Server stamps `source: "manual"`, `pending: false`, and `userId`.',
    handler: async (userId, bodies) => await createManualTransactions(userId, bodies),
    name: "transactions_create",
    schema: z.array(createTransactionSchema).min(1).max(500),
  }),
  route({
    description: "Patch a transaction the user owns (mutation). Verifies ownership first.",
    handler: async (userId, { patch, transactionId }) => {
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
    schema: createTagSchema,
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
