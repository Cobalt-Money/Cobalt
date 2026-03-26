import { getCreditSpending } from "@cobalt-web/server-data/transactions/queries";
import {
  creditSpendingQuerySchema,
  creditSpendingSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  description:
    "Aggregated credit spending bucketed by period (daily/weekly/monthly)",
  method: "get",
  path: "/credit-spending",
  request: {
    query: creditSpendingQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: creditSpendingSchema },
      },
      description: "Aggregated credit spending",
    },
  },
  summary: "Credit card spending",
  tags: ["Transactions"],
});

export const creditSpendingRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { period, accountId } = c.req.valid("query");
    const result = await getCreditSpending(c.var.user.id, period, accountId);
    return c.json(result, 200);
  }
);
