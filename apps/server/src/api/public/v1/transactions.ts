import {
  getRecurringStreams,
  getUserTransactions,
} from "@cobalt-web/server-data/transactions/queries";
import {
  recurringStreamsResponseSchema,
  transactionListQuerySchema,
  transactionListResponseSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

// NOTE: middleware is intentionally NOT imported here. Auth for the public
// API is applied at the parent `v1Router` via `.use("/*", requireOAuth)`.
// `scripts/extract-openapi.ts` imports this module without env vars loaded.

const listRoute = createRoute({
  description: "Paginated, filterable list of the authenticated user's transactions",
  method: "get",
  path: "/",
  request: { query: transactionListQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: transactionListResponseSchema },
      },
      description: "List of transactions",
    },
  },
  summary: "List transactions",
  tags: ["Transactions"],
});

const recurringRoute = createRoute({
  description: "Active recurring transaction streams (subscriptions, bills, income)",
  method: "get",
  path: "/recurring",
  responses: {
    200: {
      content: {
        "application/json": { schema: recurringStreamsResponseSchema },
      },
      description: "Recurring streams",
    },
  },
  summary: "List recurring transactions",
  tags: ["Transactions"],
});

export const transactionsRouter = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    const transactions = await getUserTransactions(c.var.user.id, c.req.valid("query"));
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ transactions }, 200);
  })
  .openapi(recurringRoute, async (c) => {
    const streams = await getRecurringStreams(c.var.user.id);
    c.header("Cache-Control", "private, max-age=300");
    return c.json({ streams }, 200);
  });
