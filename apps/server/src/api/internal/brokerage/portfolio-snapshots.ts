import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getPortfolioSnapshots,
  portfolioSnapshotsQuerySchema,
  portfolioSnapshotsResponseSchema,
} from "@cobalt-web/server-data/brokerage/portfolio-snapshots";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/portfolio-snapshots",
  request: { query: portfolioSnapshotsQuerySchema },
  responses: {
    200: jsonContent(portfolioSnapshotsResponseSchema, "Portfolio snapshots"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(portfolioSnapshotsQuerySchema),
  },
  summary: "Get portfolio snapshots",
  tags: ["Brokerage"],
});

export const portfolioSnapshotsRouter = createApp().openapi(route, async (c) => {
  // Ownership inlined in WHERE — non-owners receive an empty list.
  const snapshots = await getPortfolioSnapshots(c.var.user.id, c.req.valid("query"));
  return c.json(portfolioSnapshotsResponseSchema.parse({ snapshots }), 200);
});
