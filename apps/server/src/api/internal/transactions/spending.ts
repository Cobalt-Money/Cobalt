import { getSpending } from "@cobalt-web/server-data/transactions/queries";
import { spendingQuerySchema, spendingSchema } from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

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
    200: {
      content: {
        "application/json": { schema: spendingSchema },
      },
      description: "Aggregated spending",
    },
  },
  summary: "Spending",
  tags: ["Transactions"],
});

export const spendingRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const { period, accountType, accountId } = c.req.valid("query");
  const result = await getSpending(c.var.user.id, period, accountType, accountId);
  return c.json(result, 200);
});
