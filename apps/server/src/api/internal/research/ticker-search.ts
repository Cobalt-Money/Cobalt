import { searchTickers } from "@cobalt-web/server-data/tickers/queries";
import {
  errorResponseSchema,
  tickerSearchResponseSchema,
} from "@cobalt-web/server-data/tickers/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/search",
  responses: {
    200: {
      content: {
        "application/json": { schema: tickerSearchResponseSchema },
      },
      description: "All cached tickers for client-side search",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Search tickers (cached NASDAQ + NYSE list)",
  tags: ["Research"],
});

export const tickerSearchRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const tickers = await searchTickers();
      c.header(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      return c.json({ count: tickers.length, tickers }, 200);
    } catch {
      return c.json({ error: "Failed to fetch tickers" }, 500);
    }
  }
);
