import {
  getRecurringStreams,
  getUserTransactions,
} from "@cobalt-web/server-data/transactions/queries";
import {
  recurringStreamsResponseSchema,
  transactionListQuerySchema,
  transactionListResponseSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";

// NOTE: middleware is intentionally NOT imported here. Auth for the public
// API is applied at the parent `v1Router` via `.use("/*", requireOAuth)`.
// `scripts/extract-openapi.ts` imports this module without env vars loaded.

const listRoute = createRoute({
  description: "Paginated, filterable list of the authenticated user's transactions",
  method: "get",
  path: "/",
  request: { query: transactionListQuerySchema },
  responses: {
    200: jsonContent(transactionListResponseSchema, "List of transactions"),
    422: validationErrorResponse(transactionListQuerySchema),
  },
  summary: "List transactions",
  tags: ["Transactions"],
});

const recurringRoute = createRoute({
  description: "Active recurring transaction streams (subscriptions, bills, income)",
  method: "get",
  path: "/recurring",
  responses: {
    200: jsonContent(recurringStreamsResponseSchema, "Recurring streams"),
  },
  summary: "List recurring transactions",
  tags: ["Transactions"],
});

export const transactionsRouter = createApp()
  .openapi(listRoute, async (c) => {
    const result = await getUserTransactions(c.var.user.id, c.req.valid("query"));
    c.header("Cache-Control", "private, max-age=60");
    return c.json(result, 200);
  })
  .openapi(recurringRoute, async (c) => {
    const streams = await getRecurringStreams(c.var.user.id);
    c.header("Cache-Control", "private, max-age=300");
    return c.json({ streams }, 200);
  });
