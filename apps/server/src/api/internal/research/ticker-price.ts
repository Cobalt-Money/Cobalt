import { getTickerPrice } from "@cobalt-web/server-data/tickers/queries";
import {
  errorResponseSchema,
  symbolParamSchema,
  tickerPriceResponseSchema,
} from "@cobalt-web/server-data/tickers/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{symbol}/price",
  request: { params: symbolParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: tickerPriceResponseSchema },
      },
      description: "Current ticker price",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Quote not available",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get ticker price",
  tags: ["Research"],
});

export const tickerPriceRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbol } = c.req.valid("param");
      const result = await getTickerPrice(symbol);
      c.header(
        "Cache-Control",
        "public, s-maxage=900, stale-while-revalidate=1800"
      );
      return c.json(result, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not available")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: "Failed to fetch ticker price" }, 500);
    }
  }
);
