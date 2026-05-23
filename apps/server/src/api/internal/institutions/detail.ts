import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { institutionIdParamSchema } from "@cobalt-web/server-data/institutions/_shared";
import {
  getInstitutionDetail,
  institutionDetailSchema,
} from "@cobalt-web/server-data/institutions/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";

const route = createRoute({
  description: "Fetch a single institution from Plaid by id (proxied, mapped to our shape).",
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

export const detailRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const inst = await getInstitutionDetail(id);
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(institutionDetailSchema.parse(inst), 200);
});
