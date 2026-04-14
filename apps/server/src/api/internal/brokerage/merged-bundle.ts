import { getMergedBrokerageDataByUserId } from "@cobalt-web/server-data/brokerage/merged";
import {
  mergedBrokerageDataSchema,
  mergedBrokerageQuerySchema,
} from "@cobalt-web/server-data/brokerage/merged-schemas";
import { errorResponseSchema } from "@cobalt-web/server-data/brokerage/snaptrade/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Merged SnapTrade brokerage + Plaid investment data in one response (accounts, balances, positions, activities, snapshots, holdings-linked news).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: { query: mergedBrokerageQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: mergedBrokerageDataSchema },
      },
      description: "Merged brokerage payload",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get merged brokerage data (SnapTrade + Plaid investments)",
  tags: ["Brokerage"],
});

export const mergedBundleRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const q = c.req.valid("query");
      const data = await getMergedBrokerageDataByUserId(c.var.user.id, {
        activitiesLimit: q.activitiesLimit,
        endDate: q.endDate,
        positionsLimit: q.positionsLimit,
        startDate: q.startDate,
      });
      c.header("Cache-Control", "private, max-age=60");
      return c.json(data, 200);
    } catch {
      return c.json({ error: "Failed to fetch brokerage data" }, 500);
    }
  }
);
