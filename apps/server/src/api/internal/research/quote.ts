import {
  getQuote,
  quoteResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/quote";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
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
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Ticker not found"),
    422: validationErrorResponse(symbolQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "FMP upstream failed"),
  },
  summary: "Get stock quote (price + change)",
  tags: ["Research"],
});

export const quoteRouter = createApp().openapi(route, async (c) => {
  const { symbol } = c.req.valid("query");
  const quote = await getQuote(symbol);
  c.header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  return c.json(quoteResponseSchema.parse(quote), 200);
});
