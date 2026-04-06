import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/plaid/item/queries";
import {
  balanceSnapshotListResponseSchema,
  balanceSnapshotQuerySchema,
  errorResponseSchema,
} from "@cobalt-web/server-data/plaid/item/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const getBalanceSnapshots = createRoute({
  method: "get",
  path: "/balance-snapshots",
  request: { query: balanceSnapshotQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: balanceSnapshotListResponseSchema },
      },
      description: "Balance snapshots",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get balance snapshots",
  tags: ["Plaid"],
});

const balanceSnapshotsRouter = new OpenAPIHono<AppEnv>();

balanceSnapshotsRouter.openapi(getBalanceSnapshots, async (c) => {
  try {
    const query = c.req.valid("query");
    const snapshots = await getBalanceSnapshotsByUserId(c.var.user.id, query);
    c.header("Cache-Control", "private, max-age=86400");
    return c.json({ snapshots }, 200);
  } catch {
    return c.json({ error: "Failed to fetch balance snapshots" }, 500);
  }
});

export { balanceSnapshotsRouter };
