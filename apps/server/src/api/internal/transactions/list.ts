import { getUserTransactions } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionListQuerySchema,
  transactionListResponseSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Paginated, filterable list of user transactions",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: {
    query: transactionListQuerySchema,
  },
  responses: {
    200: jsonContent(transactionListResponseSchema, "List of transactions"),
    422: validationErrorResponse(transactionListQuerySchema),
  },
  summary: "List transactions",
  tags: ["Transactions"],
});

export const listRouter = createApp().openapi(route, async (c) => {
  const result = await getUserTransactions(c.var.user.id, c.req.valid("query"));
  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
