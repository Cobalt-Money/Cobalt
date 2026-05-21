import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { listResumableImportJobs } from "@cobalt-web/server-data/import/shared/queries";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/list",
  responses: {
    200: jsonContent(
      z.object({
        jobs: z.array(
          z.object({
            createdAt: z.string(),
            id: z.uuid(),
            originalFilename: z.string().nullable(),
            status: z.enum([
              "uploaded",
              "column_mapped",
              "account_mapped",
              "category_mapped",
              "committing",
            ]),
          }),
        ),
      }),
      "In-progress import jobs",
    ),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List resumable import jobs",
  tags: ["Imports"],
});

export const importsListRouter = createApp().openapi(route, async (c) => {
  const jobs = await listResumableImportJobs(c.var.user.id);
  return c.json({ jobs }, 200);
});
