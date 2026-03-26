import { getPortfolioSnapshotsByUserId } from "@cobalt-web/server-data/brokerage/queries";
import {
  errorResponseSchema,
  portfolioSnapshotsQuerySchema,
  portfolioSnapshotsResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/portfolio-snapshots",
  request: { query: portfolioSnapshotsQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: portfolioSnapshotsResponseSchema },
      },
      description: "Portfolio snapshots",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get portfolio snapshots",
  tags: ["Brokerage"],
});

export const portfolioSnapshotsRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const snapshots = await getPortfolioSnapshotsByUserId(
        c.var.user.id,
        c.req.valid("query")
      );
      return c.json({ snapshots }, 200);
    } catch {
      return c.json({ error: "Failed to fetch portfolio snapshots" }, 500);
    }
  }
);
