import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getTransactions,
  getTransactionsSchema,
  transactionsResponseSchema,
} from "@cobalt-web/server-data/transactions/list";
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
    query: getTransactionsSchema,
  },
  responses: {
    200: jsonContent(transactionsResponseSchema, "List of transactions"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid date range"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(getTransactionsSchema),
  },
  summary: "List transactions",
  tags: ["Transactions"],
});

export const listRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    return c.json(
      {
        code: "invalid_date_range",
        error: "startDate must be on or before endDate",
      },
      400,
    );
  }
  const result = await getTransactions(c.var.user.id, query);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(transactionsResponseSchema.parse(result), 200);
});
