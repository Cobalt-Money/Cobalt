import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getInstitutionDetail } from "@cobalt-web/server-data/institutions/detail";
import {
  getInstitutionByPlaidId,
  institutionDbSchema,
} from "@cobalt-web/server-data/institutions/detail-db";
import {
  insertInstitution,
  syncInstitutionSchema,
} from "@cobalt-web/server-data/institutions/sync";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  description:
    "Sync an institution from Plaid into the local DB. Idempotent: returns the existing row if already synced.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sync",
  request: {
    body: { content: { "application/json": { schema: syncInstitutionSchema } } },
  },
  responses: {
    200: jsonContent(institutionDbSchema, "Institution synced"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(syncInstitutionSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Plaid upstream failed"),
  },
  summary: "Sync institution from Plaid to database",
  tags: ["Institutions"],
});

export const syncRouter = createApp().openapi(route, async (c) => {
  const { institutionId } = c.req.valid("json");

  const existing = await getInstitutionByPlaidId(institutionId);
  if (existing) {
    return c.json(institutionDbSchema.parse(existing), 200);
  }

  // getInstitutionDetail throws ApiError(502, "plaid_upstream_failed") on
  // upstream failures; bubbles through onError.
  const inst = await getInstitutionDetail(institutionId);
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

  return c.json(institutionDbSchema.parse(newInstitution), 200);
});
