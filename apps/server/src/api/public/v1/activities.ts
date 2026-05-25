import type { ActivityItem } from "@cobalt-web/server-data/brokerage/activities/schema.public";
import { getActivities } from "@cobalt-web/server-data/brokerage/activities";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas.public";
import { activitySchema } from "./schemas.js";

const listQuerySchema = z.object({
  accountId: z
    .string()
    .optional()
    .openapi({ description: "Filter to a single brokerage account." }),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const activitiesResponseSchema = z
  .object({ data: z.array(activitySchema) })
  .openapi("ActivityList");

function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toActivity(a: ActivityItem) {
  return {
    accountId: a.accountId,
    amount: num(a.amount),
    currency: a.currencyCode,
    description: a.description,
    fee: num(a.fee),
    id: a.id,
    price: num(a.price),
    settlementDate: a.settlementDate,
    symbol: typeof a.symbol === "string" ? a.symbol : null,
    tradeDate: a.tradeDate,
    type: a.type,
    units: num(a.units),
  };
}

const route = createRoute({
  description:
    "Brokerage activity history — buys, sells, dividends, fees, transfers across investment accounts.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "activities_list",
  path: "/activities",
  request: { query: listQuerySchema },
  responses: {
    200: jsonContent(activitiesResponseSchema, "Activities"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List activities",
  tags: ["Activities"],
});

export const activitiesRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const q = c.req.valid("query");
  const result = await getActivities(user.id, {
    accountId: q.accountId,
    limit: q.limit,
    offset: q.offset,
  });
  return c.json(activitiesResponseSchema.parse({ data: result.activities.map(toActivity) }), 200);
});
