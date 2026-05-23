import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  searchInstitutions,
  searchInstitutionsResponseSchema,
  searchInstitutionsSchema,
} from "@cobalt-web/server-data/institutions/search";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";

const route = createRoute({
  description: "Search Plaid institutions by name (or list default set when query is empty).",
  method: "get",
  path: "/",
  request: { query: searchInstitutionsSchema },
  responses: {
    200: jsonContent(searchInstitutionsResponseSchema, "Institution search results"),
    422: validationErrorResponse(searchInstitutionsSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Plaid upstream failed"),
  },
  summary: "Search institutions",
  tags: ["Institutions"],
});

export const searchRouter = createApp().openapi(route, async (c) => {
  const { query } = c.req.valid("query");
  const institutions = await searchInstitutions(query);
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(searchInstitutionsResponseSchema.parse({ institutions }), 200);
});
