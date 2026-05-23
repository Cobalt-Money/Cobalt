import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { listResumableImportJobs } from "@cobalt-web/server-data/imports/_shared/queries";
import { importsListResponseSchema } from "@cobalt-web/server-data/imports/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
// Imports are open to all authenticated users (free + paid); paid-tier limits
// (connection cap, transaction count) are enforced downstream at commit time.
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/list",
  responses: {
    200: jsonContent(importsListResponseSchema, "In-progress import jobs"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List resumable import jobs",
  tags: ["Imports"],
});

export const importsListRouter = createApp().openapi(route, async (c) => {
  const jobs = await listResumableImportJobs(c.var.user.id);
  return c.json(importsListResponseSchema.parse({ jobs }), 200);
});
