import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { insertInstitution } from "@cobalt-web/server-data/institutions/mutations";
import { getInstitutionByPlaidId } from "@cobalt-web/server-data/institutions/queries";
import {
  institutionDbSchema,
  institutionDetailSchema,
  institutionIdParamSchema,
  institutionSearchQuerySchema,
  institutionSearchResponseSchema,
  institutionSyncBodySchema,
  institutionSyncResponseSchema,
} from "@cobalt-web/server-data/institutions/schemas";
import {
  getInstitutionById,
  searchInstitutions,
} from "@cobalt-web/server-data/providers/plaid/institutions/actions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../lib/openapi-helpers.js";
import { requireAuth } from "./middleware.js";

// ── Route definitions ───────────────────────────────────────────────

const searchRoute = createRoute({
  method: "get",
  path: "/",
  request: { query: institutionSearchQuerySchema },
  responses: {
    200: jsonContent(institutionSearchResponseSchema, "Institution search results"),
    422: validationErrorResponse(institutionSearchQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "Plaid upstream failed"),
  },
  summary: "Search institutions",
  tags: ["Institutions"],
});

const getByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: { params: institutionIdParamSchema },
  responses: {
    200: jsonContent(institutionDetailSchema, "Institution details"),
    422: validationErrorResponse(institutionIdParamSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Plaid upstream failed"),
  },
  summary: "Get institution from Plaid",
  tags: ["Institutions"],
});

const getFromDbRoute = createRoute({
  method: "get",
  path: "/db/{id}",
  request: { params: institutionIdParamSchema },
  responses: {
    200: jsonContent(institutionDbSchema, "Institution from database"),
    404: jsonContent(errorResponseWithCodeSchema, "Not found"),
    422: validationErrorResponse(institutionIdParamSchema),
  },
  summary: "Get institution from database",
  tags: ["Institutions"],
});

const syncRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sync",
  request: {
    body: {
      content: { "application/json": { schema: institutionSyncBodySchema } },
    },
  },
  responses: {
    200: jsonContent(institutionSyncResponseSchema, "Institution synced"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(institutionSyncBodySchema),
    502: jsonContent(errorResponseWithCodeSchema, "Plaid upstream failed"),
  },
  summary: "Sync institution from Plaid to database",
  tags: ["Institutions"],
});

// ── Handlers ────────────────────────────────────────────────────────

const institutionsRouter = createApp()
  // Public routes (no auth)
  .openapi(searchRoute, async (c) => {
    const { query } = c.req.valid("query");
    const institutions = await searchInstitutions(query);
    c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return c.json({ institutions }, 200);
  })
  .openapi(getByIdRoute, async (c) => {
    const { id } = c.req.valid("param");
    const inst = await getInstitutionById(id);
    c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return c.json(inst, 200);
  })
  .openapi(getFromDbRoute, async (c) => {
    const { id } = c.req.valid("param");
    const inst = await getInstitutionByPlaidId(id);
    if (!inst) {
      throw new ApiError(404, "institution_not_found", "Institution not found");
    }
    c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return c.json(inst, 200);
  })
  // Auth-protected route (requireAuth applied via route middleware)
  .openapi(syncRoute, async (c) => {
    const { institutionId } = c.req.valid("json");

    const existing = await getInstitutionByPlaidId(institutionId);
    if (existing) {
      return c.json(
        {
          institution: existing,
          message: "Institution already exists in database",
        },
        200,
      );
    }

    // getInstitutionById throws ApiError(502, "plaid_upstream_failed") on
    // upstream failures; bubbles through onError.
    const inst = await getInstitutionById(institutionId);
    const newInstitution = await insertInstitution({
      logo: inst.logo,
      name: inst.name,
      oauth: inst.oauth,
      plaidInstitutionId: inst.id,
      primaryColor: inst.primary_color,
      routingNumbers: inst.routing_numbers,
      status: inst.status ? String(inst.status) : null,
      url: inst.url,
    });

    return c.json(
      {
        institution: newInstitution,
        message: "Institution synced successfully",
      },
      200,
    );
  });

export { institutionsRouter };
