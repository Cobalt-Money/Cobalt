import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertOwnedJob, getStagedPreview } from "@cobalt-web/server-data/imports/_shared/queries";
import {
  importJobIdParamSchema,
  stagedPreviewResponseSchema,
} from "@cobalt-web/server-data/imports/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/staged-preview",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(
      stagedPreviewResponseSchema,
      "A few staged rows for the commit-screen preview",
    ),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Sample of staged rows",
  tags: ["Imports"],
});

export const importsStagedPreviewRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  await assertOwnedJob(c.var.user.id, id);
  const rows = await getStagedPreview(id);
  return c.json(stagedPreviewResponseSchema.parse({ rows }), 200);
});
