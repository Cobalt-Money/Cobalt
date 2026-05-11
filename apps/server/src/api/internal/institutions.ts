import { insertInstitution } from "@cobalt-web/server-data/institutions/mutations";
import { getInstitutionByPlaidId } from "@cobalt-web/server-data/institutions/queries";
import {
  errorResponseSchema,
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
    404: jsonContent(errorResponseSchema, "Not found"),
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
    422: validationErrorResponse(institutionSyncBodySchema),
    500: jsonContent(errorResponseSchema, "Server error"),
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
      return c.json({ error: "Institution not found in database" }, 404);
    }
    c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return c.json(inst, 200);
  })
  // Auth-protected route (requireAuth applied via route middleware)
  .openapi(syncRoute, async (c) => {
    try {
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
    } catch (error) {
      return c.json(
        {
          details: error instanceof Error ? error.message : "Unknown error",
          error: "Failed to sync institution",
        },
        500,
      );
    }
  });

export { institutionsRouter };
