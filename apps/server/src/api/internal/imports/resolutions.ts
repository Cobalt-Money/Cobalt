import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  assertOwnedJob,
  getImportResolutions,
} from "@cobalt-web/server-data/import/shared/queries";
import {
  importJobIdParamSchema,
  importResolutionsResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/resolutions",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(
      importResolutionsResponseSchema,
      "Confirmed account + category decisions for this import",
    ),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Account + category resolutions for this import",
  tags: ["Imports"],
});

export const importsResolutionsRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  await assertOwnedJob(c.var.user.id, id);
  const resolutions = await getImportResolutions(id);
  return c.json(resolutions, 200);
});
