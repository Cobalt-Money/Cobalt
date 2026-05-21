import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { deleteImportJob } from "@cobalt-web/server-data/import/shared/mutations";
import { getImportJobStatus } from "@cobalt-web/server-data/import/shared/queries";
import {
  importJobIdParamSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/{id}",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Import job discarded"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Import job not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Cannot delete a committed job"),
  },
  summary: "Discard an in-progress import job",
  tags: ["Imports"],
});

export const importsDeleteRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const job = await getImportJobStatus(c.var.user.id, id);
  if (!job) {
    return c.json({ code: "import_job_not_found", error: "Import job not found" }, 404);
  }
  if (job.status === "committed") {
    return c.json(
      {
        code: "import_job_committed",
        error: "Cannot delete a committed import — its transactions are already saved.",
      },
      409,
    );
  }
  await deleteImportJob(c.var.user.id, id);
  return c.json({ message: "Import discarded", success: true }, 200);
});
