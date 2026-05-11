import { fmpGetQuote } from "@cobalt-web/server-data/research/fmp-ticker";
import { quoteResponseSchema, symbolQuerySchema } from "@cobalt-web/server-data/research/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/quote",
  request: { query: symbolQuerySchema },
  responses: {
    200: jsonContent(quoteResponseSchema, "Quote data"),
    422: validationErrorResponse(symbolQuerySchema),
  },
  summary: "Get stock quote (price + change)",
  tags: ["Research"],
});

export const quoteRouter = createApp().openapi(route, async (c) => {
  const { symbol } = c.req.valid("query");
  const quote = await fmpGetQuote(symbol);
  c.header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  return c.json(quote, 200);
});
