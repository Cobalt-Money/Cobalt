import { getMergedBrokerageDataByUserId } from "@cobalt-web/server-data/brokerage/merged";
import {
  mergedBrokerageDataSchema,
  mergedBrokerageQuerySchema,
} from "@cobalt-web/server-data/brokerage/merged-schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Merged SnapTrade brokerage + Plaid investment data in one response (accounts, balances, positions, activities, snapshots, holdings-linked news).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: { query: mergedBrokerageQuerySchema },
  responses: {
    200: jsonContent(mergedBrokerageDataSchema, "Merged brokerage payload"),
    422: validationErrorResponse(mergedBrokerageQuerySchema),
  },
  summary: "Get merged brokerage data (SnapTrade + Plaid investments)",
  tags: ["Brokerage"],
});

export const mergedBundleRouter = createApp().openapi(route, async (c) => {
  const q = c.req.valid("query");
  const data = await getMergedBrokerageDataByUserId(c.var.user.id, {
    activitiesLimit: q.activitiesLimit,
    endDate: q.endDate,
    positionsLimit: q.positionsLimit,
    startDate: q.startDate,
  });
  c.header("Cache-Control", "private, max-age=60");
  return c.json(data, 200);
});
