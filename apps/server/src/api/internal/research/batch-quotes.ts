import { fmpStableGet } from "@cobalt-web/clients/fmp";
import { errorResponseSchema } from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const batchQuotesQuerySchema = z.object({
  symbols: z.string().min(1).openapi({
    description: "Comma-separated ticker symbols",
    example: "AAPL,MSFT,GOOGL",
  }),
});

const batchQuoteItemSchema = z.object({
  price: z.number().nullable(),
  symbol: z.string(),
});

const batchQuotesResponseSchema = z.object({
  quotes: z.array(batchQuoteItemSchema),
});

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  return null;
}

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/batch-quotes",
  request: { query: batchQuotesQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: batchQuotesResponseSchema } },
      description: "Batch quote prices",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get prices for multiple tickers",
  tags: ["Research"],
});

export const batchQuotesRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbols } = c.req.valid("query");
      const raw = await fmpStableGet("batch-quote", { symbols });
      const arr = Array.isArray(raw) ? raw : [];

      const quotes = arr
        .filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === "object"
        )
        .map((item) => ({
          price: num(item.price),
          symbol:
            typeof item.symbol === "string" ? item.symbol.toUpperCase() : "",
        }))
        .filter((q) => q.symbol.length > 0);

      c.header(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      return c.json({ quotes }, 200);
    } catch {
      return c.json({ error: "Failed to fetch batch quotes" }, 500);
    }
  }
);
