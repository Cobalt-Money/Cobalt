import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { errorResponse } from "./shared/schemas.js";

// NOTE: `requireOAuth` is intentionally NOT imported or attached here.
// `scripts/extract-openapi.ts` imports this module at build time to
// generate `openapi.json` for fumadocs/Scalar, and it relies on this
// file being free of middleware/auth/env imports. Auth for the public
// API is applied at the parent `v1Router` via `.use("/*", requireOAuth)`.

// ── Schemas (public API contract) ───────────────────────────────────

const tickerParamSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .openapi({ description: "Ticker symbol (e.g. AAPL)", example: "AAPL" }),
});

const tickerQuoteSchema = z.object({
  change: z.number().openapi({ example: 1.25 }),
  changePercent: z.number().openapi({ example: 0.67 }),
  currency: z.string().openapi({ example: "USD" }),
  high: z.number().openapi({ example: 189.98 }),
  low: z.number().openapi({ example: 186.01 }),
  marketCap: z.number().optional().openapi({ example: 2_940_000_000_000 }),
  open: z.number().openapi({ example: 187.15 }),
  price: z.number().openapi({ example: 188.4 }),
  symbol: z.string().openapi({ example: "AAPL" }),
  volume: z.number().openapi({ example: 58_234_100 }),
});

const searchQuerySchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(50)
    .default(10)
    .openapi({ description: "Max results to return", example: 10 }),
  q: z.string().min(1).openapi({ description: "Search query", example: "apple" }),
});

const searchResultSchema = z.object({
  results: z.array(
    z.object({
      exchange: z.string().openapi({ example: "NASDAQ" }),
      name: z.string().openapi({ example: "Apple Inc." }),
      symbol: z.string().openapi({ example: "AAPL" }),
      type: z.string().openapi({ example: "equity" }),
    }),
  ),
});

// ── Routes ──────────────────────────────────────────────────────────

const getQuote = createRoute({
  description: "Get the latest quote for a ticker symbol",
  method: "get",
  path: "/{symbol}/quote",
  request: { params: tickerParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: tickerQuoteSchema } },
      description: "Ticker quote",
    },
    ...errorResponse(404, "Ticker not found"),
  },
  summary: "Get ticker quote",
  tags: ["Tickers"],
});

const searchTickers = createRoute({
  description: "Search for tickers by name or symbol",
  method: "get",
  path: "/search",
  request: { query: searchQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: searchResultSchema } },
      description: "Search results",
    },
  },
  summary: "Search tickers",
  tags: ["Tickers"],
});

// ── Router ──────────────────────────────────────────────────────────

export const tickersRouter = new OpenAPIHono<AppEnv>()
  .openapi(getQuote, (c) => {
    const { symbol } = c.req.valid("param");

    // Stub — wire up to actual data source
    return c.json(
      {
        change: 0,
        changePercent: 0,
        currency: "USD",
        high: 0,
        low: 0,
        open: 0,
        price: 0,
        symbol: symbol.toUpperCase(),
        volume: 0,
      },
      200,
    );
  })
  .openapi(searchTickers, (c) => {
    const { q: _q, limit: _limit } = c.req.valid("query");

    // Stub — wire up to actual data source
    return c.json({ results: [] }, 200);
  });
