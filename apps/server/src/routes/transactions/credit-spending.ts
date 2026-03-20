import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { getCreditSpending } from "../../db/transactions.js";
import type { AppEnv } from "../../lib/types.js";
import { creditSpendingSchema } from "./schemas.js";

const route = createRoute({
  description:
    "Aggregated credit spending bucketed by period (daily/weekly/monthly)",
  method: "get",
  path: "/credit-spending",
  request: {
    query: z.object({
      accountId: z.string().optional(),
      period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]),
    }),
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
