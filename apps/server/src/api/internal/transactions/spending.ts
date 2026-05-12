import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertAccountOwned } from "@cobalt-web/server-data/transactions/errors";
import { getSpending } from "@cobalt-web/server-data/transactions/queries";
import { spendingQuerySchema, spendingSchema } from "@cobalt-web/server-data/transactions/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Aggregated spending bucketed by period (daily/weekly/monthly). Covers credit and depository outflows; honors per-tx and per-category insight exclusions.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/spending",
  request: {
    query: spendingQuerySchema,
  },
  responses: {
    200: jsonContent(spendingSchema, "Aggregated spending"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(spendingQuerySchema),
  },
  summary: "Spending",
  tags: ["Transactions"],
});

export const spendingRouter = createApp().openapi(route, async (c) => {
  const { period, accountType, accountId } = c.req.valid("query");
  if (accountId) {
    await assertAccountOwned(accountId, c.var.user.id);
  }
  const result = await getSpending(c.var.user.id, period, accountType, accountId);
  return c.json(result, 200);
});
