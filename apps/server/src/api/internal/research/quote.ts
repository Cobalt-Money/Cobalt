import { processQuoteData } from "@cobalt-web/server-data/research/lib";
import { getQuoteData } from "@cobalt-web/server-data/research/queries";
import {
  errorResponseSchema,
  quoteResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/quote",
  request: { query: symbolQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: quoteResponseSchema } },
      description: "Quote data",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get stock quote (price + change)",
  tags: ["Research"],
});

export const quoteRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbol } = c.req.valid("query");
      const raw = await getQuoteData(symbol);
      const processed = processQuoteData(raw);
      c.header(
        "Cache-Control",
        "public, s-maxage=900, stale-while-revalidate=3600"
      );
      return c.json(processed, 200);
    } catch {
      return c.json({ error: "Failed to fetch quote data" }, 500);
    }
  }
);
