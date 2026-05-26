import { getSpending } from "@cobalt-web/server-data/spending/query";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { spendingSchema } from "./schemas.js";

const querySchema = z.object({
  accountId: z.string().optional(),
  accountType: z.enum(["credit", "depository", "all"]).default("all"),
  period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]).default("1m"),
});

const spendingResponseSchema = spendingSchema.openapi("SpendingResponse");

const route = createRoute({
  description:
    "Aggregated spending over a time window. Returns a bucket series for charting plus running total + average.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "spending_get",
  path: "/spending",
  request: { query: querySchema },
  responses: {
    200: jsonContent(spendingResponseSchema, "Spending aggregate"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "Get spending",
  tags: ["Spending"],
});

export const spendingRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const q = c.req.valid("query");
  const result = await getSpending(user.id, q.period, q.accountType, q.accountId);
  return c.json(
    spendingResponseSchema.parse({
      averageLabel: result.averageLabel,
      averageSpending: result.averageSpending,
      buckets: result.spending,
      totalSpending: result.totalSpending,
    }),
    200,
  );
});
