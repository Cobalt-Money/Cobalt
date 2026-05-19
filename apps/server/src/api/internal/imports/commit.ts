import { runPreCommitGate } from "@cobalt-web/server-data/import/commit/pre-commit-gate";
import { getImportJobStatus } from "@cobalt-web/server-data/import/shared/queries";
import {
  commitBodySchema,
  importJobIdParamSchema,
  preCommitGateResponseSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
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
    body: { content: { "application/json": { schema: commitBodySchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Commit workflow triggered"),
    404: { description: "Import job not found" },
    409: { description: "Job not ready for commit" },
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
    return c.json({ error: "Import job not found" }, 404);
  }
  if (job.status !== "category_mapped") {
    return c.json(
      { error: `Cannot commit job in status "${job.status}"; expected "category_mapped"` },
      409,
    );
  }
  const gate = await runPreCommitGate(c.var.user.id, id);
  // Block outright on hard reasons; block on warnings unless the user overrode them.
  if (gate.blocked || (gate.warnings.length > 0 && !override)) {
    return c.json({ blocked: gate.blocked, reasons: gate.reasons, warnings: gate.warnings }, 422);
  }
  await start(importCommitWorkflow, [{ jobId: id, userId: c.var.user.id }]);
  return c.json({ message: "Commit in progress", success: true }, 200);
});
