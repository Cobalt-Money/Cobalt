import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { institutionIdParamSchema } from "@cobalt-web/server-data/institutions/_shared";
import {
  getInstitutionByPlaidId,
  institutionDbSchema,
} from "@cobalt-web/server-data/institutions/detail-db";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";

const route = createRoute({
  description: "Fetch the local DB row for an institution by Plaid institution id.",
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

export const detailDbRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const inst = await getInstitutionByPlaidId(id);
  if (!inst) {
    throw new ApiError(404, "institution_not_found", "Institution not found");
  }
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(institutionDbSchema.parse(inst), 200);
});
