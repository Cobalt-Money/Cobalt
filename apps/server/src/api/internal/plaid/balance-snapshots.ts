import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import {
  balanceSnapshotListResponseSchema,
  balanceSnapshotQuerySchema,
} from "@cobalt-web/server-data/snapshots/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const getBalanceSnapshots = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/balance-snapshots",
  request: { query: balanceSnapshotQuerySchema },
  responses: {
    200: jsonContent(balanceSnapshotListResponseSchema, "Balance snapshots"),
    422: validationErrorResponse(balanceSnapshotQuerySchema),
  },
  summary: "Get balance snapshots",
  tags: ["Plaid"],
});

const balanceSnapshotsRouter = createApp().openapi(getBalanceSnapshots, async (c) => {
  const query = c.req.valid("query");
  const snapshots = await getBalanceSnapshotsByUserId(c.var.user.id, query);
  c.header("Cache-Control", "private, max-age=86400");
  return c.json({ snapshots }, 200);
});

export { balanceSnapshotsRouter };
