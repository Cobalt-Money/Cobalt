import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertBrokerageAccountOwnedById } from "@cobalt-web/server-data/brokerage/errors";
import { getPortfolioSnapshotsByUserId } from "@cobalt-web/server-data/brokerage/queries";
import {
  portfolioSnapshotsQuerySchema,
  portfolioSnapshotsResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
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
    404: jsonContent(errorResponseWithCodeSchema, "Brokerage account not found"),
    422: validationErrorResponse(portfolioSnapshotsQuerySchema),
  },
  summary: "Get portfolio snapshots",
  tags: ["Brokerage"],
});

export const portfolioSnapshotsRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  if (query.accountId && query.accountId !== "all-accounts") {
    await assertBrokerageAccountOwnedById(query.accountId, c.var.user.id);
  }
  const snapshots = await getPortfolioSnapshotsByUserId(c.var.user.id, query);
  return c.json({ snapshots }, 200);
});
