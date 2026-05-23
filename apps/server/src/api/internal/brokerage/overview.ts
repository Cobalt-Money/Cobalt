import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  brokerageOverviewQuerySchema,
  brokerageOverviewSchema,
  getBrokerageOverview,
} from "@cobalt-web/server-data/brokerage/overview";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Brokerage overview (SnapTrade + Plaid investment, unified): accounts, balances, positions, activities, snapshots, holdings-linked news.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: { query: brokerageOverviewQuerySchema },
  responses: {
    200: jsonContent(brokerageOverviewSchema, "Brokerage overview payload"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(brokerageOverviewQuerySchema),
  },
  summary: "Get brokerage overview",
  tags: ["Brokerage"],
});

export const overviewRouter = createApp().openapi(route, async (c) => {
  const q = c.req.valid("query");
  const data = await getBrokerageOverview(c.var.user.id, {
    activitiesLimit: q.activitiesLimit,
    endDate: q.endDate,
    positionsLimit: q.positionsLimit,
    startDate: q.startDate,
  });
  c.header("Cache-Control", "private, max-age=60");
  return c.json(brokerageOverviewSchema.parse(data), 200);
});
