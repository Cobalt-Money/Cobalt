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
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "./middleware.js";

// ── Route definitions ───────────────────────────────────────────────

const searchRoute = createRoute({
  method: "get",
  path: "/",
  request: { query: institutionSearchQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: institutionSearchResponseSchema },
      },
      description: "Institution search results",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Search institutions",
  tags: ["Institutions"],
});

const getByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: { params: institutionIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: institutionDetailSchema },
      },
      description: "Institution details",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get institution from Plaid",
  tags: ["Institutions"],
});

const getFromDbRoute = createRoute({
  method: "get",
  path: "/db/{id}",
  request: { params: institutionIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: institutionDbSchema },
      },
      description: "Institution from database",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Not found",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
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
    200: {
      content: {
        "application/json": { schema: institutionSyncResponseSchema },
      },
      description: "Institution synced",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Sync institution from Plaid to database",
  tags: ["Institutions"],
});

// ── Handlers ────────────────────────────────────────────────────────

const institutionsRouter = new OpenAPIHono<AppEnv>()
  // Public routes (no auth)
  .openapi(searchRoute, async (c) => {
    try {
      const { query } = c.req.valid("query");
      const institutions = await searchInstitutions(query);
      c.header(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      return c.json({ institutions }, 200);
    } catch {
      return c.json({ error: "Failed to fetch institutions" }, 500);
    }
  })
  .openapi(getByIdRoute, async (c) => {
    try {
      const { id } = c.req.valid("param");
      const inst = await getInstitutionById(id);
      c.header(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      return c.json(inst, 200);
    } catch {
      return c.json({ error: "Failed to fetch institution details" }, 500);
    }
  })
  .openapi(getFromDbRoute, async (c) => {
    try {
      const { id } = c.req.valid("param");
      const inst = await getInstitutionByPlaidId(id);
      if (!inst) {
        return c.json({ error: "Institution not found in database" }, 404);
      }
      c.header(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      return c.json(inst, 200);
    } catch {
      return c.json({ error: "Failed to fetch institution" }, 500);
    }
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
          200
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
        200
      );
    } catch (error) {
      return c.json(
        {
          details: error instanceof Error ? error.message : "Unknown error",
          error: "Failed to sync institution",
        },
        500
      );
    }
  });

export { institutionsRouter };
