import { geocodeSearch } from "@cobalt-web/server-data/transactions/geocode";
import {
  geocodeSearchQuerySchema,
  geocodeSearchResponseSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const search = createRoute({
  description:
    "Free-text geocoding via OpenStreetMap Nominatim. Returns up to 5 candidates.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/geocode",
  request: { query: geocodeSearchQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: geocodeSearchResponseSchema } },
      description: "Geocoding candidates",
    },
  },
  summary: "Search for a location by free-text query",
  tags: ["Transactions"],
});

export const geocodeRouter = new OpenAPIHono<AppEnv>().openapi(
  search,
  async (c) => {
    const { q } = c.req.valid("query");
    const results = await geocodeSearch(q);
    return c.json({ results }, 200);
  }
);
