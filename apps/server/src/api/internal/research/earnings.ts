import {
  getEarningsEstimates,
  getEarningsHistory,
} from "@cobalt-web/server-data/research/queries";
import {
  earningsResponseSchema,
  errorResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/earnings",
  request: { query: symbolQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: earningsResponseSchema } },
      description: "Earnings data",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get earnings history + estimates",
  tags: ["Research"],
});

export const earningsRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbol } = c.req.valid("query");
      const [earningsHistory, earningsEstimates] = await Promise.all([
        getEarningsHistory(symbol),
        getEarningsEstimates(symbol),
      ]);
      c.header(
        "Cache-Control",
        "public, s-maxage=604800, stale-while-revalidate=86400"
      );
      return c.json({ earningsEstimates, earningsHistory }, 200);
    } catch {
      return c.json({ error: "Failed to fetch earnings data" }, 500);
    }
  }
);
