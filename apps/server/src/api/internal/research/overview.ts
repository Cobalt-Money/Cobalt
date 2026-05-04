import { fmpGetProfile } from "@cobalt-web/server-data/research/fmp-ticker";
import {
  errorResponseSchema,
  overviewResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/overview",
  request: { query: symbolQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: overviewResponseSchema } },
      description: "Company overview",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get company overview",
  tags: ["Research"],
});

export const overviewRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  try {
    const { symbol } = c.req.valid("query");
    const profile = await fmpGetProfile(symbol);
    c.header("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");
    return c.json(profile, 200);
  } catch {
    return c.json({ error: "Failed to fetch company overview" }, 500);
  }
});
