import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { confirmColumnMapping } from "@cobalt-web/server-data/imports/column-mapping/actions";
import { lookupColumnMappingCache } from "@cobalt-web/server-data/imports/column-mapping/cache";
import {
  lookupColumnRoles,
  reconstructMapping,
} from "@cobalt-web/server-data/imports/column-mapping/per-name-cache";
import { persistSchemaMapping } from "@cobalt-web/server-data/imports/_shared/mutations";
import { assertOwnedJob } from "@cobalt-web/server-data/imports/_shared/queries";
import {
  columnMappingConfirmResponseSchema,
  columnMappingResponseSchema,
  confirmColumnMappingSchema,
  importJobIdParamSchema,
} from "@cobalt-web/server-data/imports/_shared/schemas";
import {
  getRawRowsHeaders,
  getRawSampleRows,
} from "@cobalt-web/server-data/imports/upload/queries";
import { createRoute } from "@hono/zod-openapi";

import { runCsvColumnMappingAgent } from "../../../ai/agents/import/csv-column-mapping/csv-column-mapping-agent.js";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const suggestRoute = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/column-map",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(columnMappingResponseSchema, "AI-inferred column mapping"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Import job not found"),
  },
  summary: "Suggest column mapping (Step 2)",
  tags: ["Imports"],
});

const confirmRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/column-map",
  request: {
    body: { content: { "application/json": { schema: confirmColumnMappingSchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: jsonContent(columnMappingConfirmResponseSchema, "Mapping confirmed; rows staged"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Confirm column mapping",
  tags: ["Imports"],
});

/**
 * Tier 1: whole-header-set cache. Tier 2: per-header role cache. Tier 3: AI agent.
 * Per-header cache lets partial overlap skip the agent (e.g. Mint export +/- Labels/Notes
 * vs prior import). Returns the mapping plus a `cacheSource` for telemetry.
 */
async function resolveColumnMapping(
  userId: string,
  jobId: string,
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<{ mapping: CsvMapping; cacheSource: "whole-set" | "per-name" | "ai-agent" }> {
  const cached = await lookupColumnMappingCache(userId, headers);
  if (cached) {
    console.log(
      `[import.columnMapping] job=${jobId} source=user-cache (whole-set hit, skipping AI agent)`,
    );
    return { cacheSource: "whole-set", mapping: cached };
  }
  const perNameRoles = await lookupColumnRoles(userId, headers);
  const reconstructed = perNameRoles.size > 0 ? reconstructMapping(headers, perNameRoles) : null;
  if (reconstructed) {
    console.log(
      `[import.columnMapping] job=${jobId} source=per-name-cache (assembled from ${perNameRoles.size} header roles, skipping AI agent)`,
    );
    return { cacheSource: "per-name", mapping: reconstructed };
  }
  console.log(
    `[import.columnMapping] job=${jobId} source=ai-agent (whole-set MISS; per-name cache has ${perNameRoles.size}/${headers.length} headers — insufficient to reconstruct)`,
  );
  const mapping = await runCsvColumnMappingAgent({ headers, rows: sampleRows });
  return { cacheSource: "ai-agent", mapping };
}

export const importsColumnMapRouter = createApp()
  .openapi(suggestRoute, async (c) => {
    const { id } = c.req.valid("param");
    const headers = await getRawRowsHeaders(id);
    const sampleRows = await getRawSampleRows(id, 20);
    if (headers.length === 0) {
      return c.json({ code: "no_raw_rows", error: "No raw rows for job" }, 404);
    }
    const job = await assertOwnedJob(c.var.user.id, id);
    if (job.schemaMapping) {
      console.log(
        `[import.columnMapping] job=${id} source=resume (schemaMapping already persisted)`,
      );
      return c.json(
        columnMappingResponseSchema.parse({
          fromCache: true,
          headers,
          mapping: job.schemaMapping,
          sampleRows,
        }),
        200,
      );
    }
    const { cacheSource, mapping } = await resolveColumnMapping(
      c.var.user.id,
      id,
      headers,
      sampleRows,
    );
    await persistSchemaMapping(id, mapping);
    return c.json(
      columnMappingResponseSchema.parse({
        fromCache: cacheSource !== "ai-agent",
        headers,
        mapping,
        sampleRows,
      }),
      200,
    );
  })
  .openapi(confirmRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const { rejected, staged } = await confirmColumnMapping(c.var.user.id, id, body);
    return c.json(
      columnMappingConfirmResponseSchema.parse({ rejected, staged, success: true }),
      200,
    );
  });
