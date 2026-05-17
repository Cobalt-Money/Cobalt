import { getImportJobStatus } from "@cobalt-web/server-data/import/shared/queries";
import {
  importJobIdParamSchema,
  importStatusResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(importStatusResponseSchema, "Import job status"),
    404: { description: "Import job not found" },
  },
  summary: "Get import job status",
  tags: ["Imports"],
});

export const importsStatusRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const result = await getImportJobStatus(c.var.user.id, id);
  if (!result) {
    return c.json({ error: "Import job not found" }, 404);
  }
  return c.json(result, 200);
});
