import { setAccountMap } from "@cobalt-web/server-data/import/mutations";
import { uploadAndStageImport } from "@cobalt-web/server-data/import/upload";
import { getImportJobStatus } from "@cobalt-web/server-data/import/queries";
import {
  accountMapBodySchema,
  importJobIdParamSchema,
  importStatusResponseSchema,
  successResponseSchema,
  uploadResponseSchema,
} from "@cobalt-web/server-data/import/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { importCommitWorkflow } from "../../../workflows/import/commit/workflow.js";
import { importDedupeWorkflow } from "../../../workflows/import/dedupe/workflow.js";
import { requireAuth } from "../middleware.js";

/** 5 MB cap covers Mint's 10k-row export limit (~3 MB at p99 row size) with margin. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const status = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: importStatusResponseSchema } },
      description: "Import job status + extracted accounts/categories + preview counts",
    },
    404: { description: "Import job not found" },
  },
  summary: "Get import job status",
  tags: ["Imports"],
});

const setAccountMapRoute = createRoute({
  method: "put",
  middleware: [requireAuth] as const,
  path: "/{id}/account-map",
  request: {
    body: { content: { "application/json": { schema: accountMapBodySchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Mapping persisted; dedupe workflow triggered",
    },
  },
  summary: "Submit source-account → Cobalt-account mapping",
  tags: ["Imports"],
});

const commit = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/commit",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Commit workflow triggered",
    },
    404: { description: "Import job not found" },
    409: { description: "Job is not in `mapped` state" },
  },
  summary: "Commit deduped staged rows into transactions",
  tags: ["Imports"],
});

// All `.openapi()` routes chained first (preserves OpenAPIHono's chained type),
// then `.post()` for the multipart upload at the end (returns plain Hono — fine
// since no further chaining is needed).
const importsRouter = new OpenAPIHono<AppEnv>()
  .openapi(status, async (c) => {
    const { id } = c.req.valid("param");
    const result = await getImportJobStatus(c.var.user.id, id);
    if (!result) {
      return c.json({ error: "Import job not found" }, 404);
    }
    return c.json(result, 200);
  })
  .openapi(setAccountMapRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await setAccountMap(c.var.user.id, id, body);
    await start(importDedupeWorkflow, [{ jobId: id, userId: c.var.user.id }]);
    return c.json({ message: "Mapping saved; dedupe in progress", success: true }, 200);
  })
  .openapi(commit, async (c) => {
    const { id } = c.req.valid("param");
    const job = await getImportJobStatus(c.var.user.id, id);
    if (!job) {
      return c.json({ error: "Import job not found" }, 404);
    }
    if (job.status !== "mapped") {
      return c.json(
        { error: `Cannot commit job in status "${job.status}"; expected "mapped"` },
        409,
      );
    }
    await start(importCommitWorkflow, [{ jobId: id, userId: c.var.user.id }]);
    return c.json({ message: "Commit in progress", success: true }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const form = await c.req.parseBody({ all: false });
    const { file } = form;
    if (!(file instanceof File)) {
      return c.json({ error: "Missing 'file' field" }, 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ error: "File exceeds 5 MB limit" }, 413);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const { accounts, categories, jobId } = await uploadAndStageImport({
        buffer,
        filename: file.name,
        userId: c.var.user.id,
      });
      return c.json(
        uploadResponseSchema.parse({
          accounts,
          categories,
          id: jobId,
        }),
        201,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return c.json({ error: message }, 400);
    }
  });

// Touch z to prevent tree-shaking the schema namespace import drizzle-zod plugins rely on.
void z;

export { importsRouter };
