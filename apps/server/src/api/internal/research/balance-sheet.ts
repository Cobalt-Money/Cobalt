import { getBalanceSheet } from "@cobalt-web/server-data/research/queries";
import {
  balanceSheetResponseSchema,
  errorResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/balance-sheet",
  request: { query: symbolQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: balanceSheetResponseSchema },
      },
      description: "Balance sheet",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get balance sheet",
  tags: ["Research"],
});

export const balanceSheetRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbol } = c.req.valid("query");
      const balanceSheet = await getBalanceSheet(symbol);
      c.header(
        "Cache-Control",
        "public, s-maxage=2592000, stale-while-revalidate=86400"
      );
      return c.json(balanceSheet as Record<string, unknown>, 200);
    } catch {
      return c.json({ error: "Failed to fetch balance sheet" }, 500);
    }
  }
);
