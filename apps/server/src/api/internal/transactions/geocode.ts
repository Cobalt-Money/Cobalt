import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  geocodeSearch,
  geocodeSearchQuerySchema,
  geocodeSearchResponseSchema,
} from "@cobalt-web/server-data/geocode";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const search = createRoute({
  description: "Free-text geocoding via OpenStreetMap Nominatim. Returns up to 5 candidates.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/geocode",
  request: { query: geocodeSearchQuerySchema },
  responses: {
    200: jsonContent(geocodeSearchResponseSchema, "Geocoding candidates"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(geocodeSearchQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "Geocoder upstream failed"),
  },
  summary: "Search for a location by free-text query",
  tags: ["Transactions"],
});

export const geocodeRouter = createApp().openapi(search, async (c) => {
  const { q } = c.req.valid("query");
  const results = await geocodeSearch(q);
  return c.json({ results }, 200);
});
