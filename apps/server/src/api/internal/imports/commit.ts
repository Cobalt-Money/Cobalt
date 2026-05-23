import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { runPreCommitGate } from "@cobalt-web/server-data/imports/commit/pre-commit-gate";
import { getImportJobStatus } from "@cobalt-web/server-data/imports/_shared/queries";
import {
  commitSchema,
  importJobIdParamSchema,
  preCommitGateResponseSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/imports/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { importCommitWorkflow } from "../../../workflows/import/commit/workflow.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/commit",
  request: {
    body: { content: { "application/json": { schema: commitSchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Commit workflow triggered"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Import job not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Job not ready for commit"),
    422: jsonContent(
      preCommitGateResponseSchema,
      "Pre-commit gate blocked the import, or raised warnings needing override",
    ),
  },
  summary: "Commit staged rows into transactions",
  tags: ["Imports"],
});

export const importsCommitRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const { override } = c.req.valid("json");
  const job = await getImportJobStatus(c.var.user.id, id);
  if (!job) {
    return c.json({ code: "import_job_not_found", error: "Import job not found" }, 404);
  }
  if (job.status !== "category_mapped") {
    return c.json(
      {
        code: "import_job_not_ready",
        error: `Cannot commit job in status "${job.status}"; expected "category_mapped"`,
      },
      409,
    );
  }
  const gate = await runPreCommitGate(c.var.user.id, id);
  // Block outright on hard reasons; block on warnings unless the user overrode them.
  if (gate.blocked || (gate.warnings.length > 0 && !override)) {
    return c.json(
      preCommitGateResponseSchema.parse({
        blocked: gate.blocked,
        reasons: gate.reasons,
        warnings: gate.warnings,
      }),
      422,
    );
  }
  await start(importCommitWorkflow, [{ jobId: id, userId: c.var.user.id }]);
  return c.json(successResponseSchema.parse({ message: "Commit in progress", success: true }), 200);
});
