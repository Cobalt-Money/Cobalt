import { fmpGetProfile } from "@cobalt-web/server-data/research/fmp-ticker";
import {
  overviewResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/overview",
  request: { query: symbolQuerySchema },
  responses: {
    200: jsonContent(overviewResponseSchema, "Company overview"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Ticker not found"),
    422: validationErrorResponse(symbolQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "FMP upstream failed"),
  },
  summary: "Get company overview",
  tags: ["Research"],
});

export const overviewRouter = createApp().openapi(route, async (c) => {
  const { symbol } = c.req.valid("query");
  const profile = await fmpGetProfile(symbol);
  c.header("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");
  return c.json(profile, 200);
});
