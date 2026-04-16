import { getIncomeStatement } from "@cobalt-web/server-data/research/queries";
import {
  errorResponseSchema,
  incomeStatementResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/income",
  request: { query: symbolQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: incomeStatementResponseSchema },
      },
      description: "Income statement",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get income statement",
  tags: ["Research"],
});

export const incomeRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbol } = c.req.valid("query");
      const income = await getIncomeStatement(symbol);
      c.header(
        "Cache-Control",
        "public, s-maxage=2592000, stale-while-revalidate=86400"
      );
      return c.json(income as Record<string, unknown>, 200);
    } catch {
      return c.json({ error: "Failed to fetch income statement" }, 500);
    }
  }
);
