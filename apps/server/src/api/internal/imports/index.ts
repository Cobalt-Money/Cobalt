import { db } from "@cobalt-web/db";
import { confirmAccountMapping } from "@cobalt-web/server-data/import/account-mapping/actions";
import { lookupAccountMappingCache } from "@cobalt-web/server-data/import/account-mapping/cache";
import { getStagedAccountLabels } from "@cobalt-web/server-data/import/account-mapping/queries";
import { confirmCategoryMapping } from "@cobalt-web/server-data/import/category-mapping/actions";
import { lookupCategoryMappingCache } from "@cobalt-web/server-data/import/category-mapping/cache";
import { getStagedCategoryLabels } from "@cobalt-web/server-data/import/category-mapping/queries";
import { confirmColumnMapping } from "@cobalt-web/server-data/import/column-mapping/actions";
import { lookupColumnMappingCache } from "@cobalt-web/server-data/import/column-mapping/cache";
import { requestCancel } from "@cobalt-web/server-data/import/shared/mutations";
import { getImportJobStatus } from "@cobalt-web/server-data/import/shared/queries";
import {
  accountSuggestionsResponseSchema,
  categorySuggestionsResponseSchema,
  columnMappingResponseSchema,
  confirmAccountMappingBodySchema,
  confirmCategoryMappingBodySchema,
  confirmColumnMappingBodySchema,
  importJobIdParamSchema,
  importStatusResponseSchema,
  successResponseSchema,
  uploadResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
import { ImportGateError, MAX_UPLOAD_BYTES } from "@cobalt-web/server-data/import/upload/gates";
import { getRawRowsHeaders, getRawSampleRows } from "@cobalt-web/server-data/import/upload/queries";

import type { AccountSuggestion } from "../../../ai/agents/csv-account-mapping/csv-account-mapping-agent.js";
import { runCsvAccountMappingAgent } from "../../../ai/agents/csv-account-mapping/csv-account-mapping-agent.js";
import type { CategorySuggestion } from "../../../ai/agents/csv-category-mapping/csv-category-mapping-agent.js";
import { runCsvCategoryMappingAgent } from "../../../ai/agents/csv-category-mapping/csv-category-mapping-agent.js";
import { runCsvColumnMappingAgent } from "../../../ai/agents/csv-column-mapping/csv-column-mapping-agent.js";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { importCommitWorkflow } from "../../../workflows/import/commit/workflow.js";
import { requireAuth } from "../middleware.js";

const status = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: importStatusResponseSchema } },
      description: "Import job status",
    },
    404: { description: "Import job not found" },
  },
  summary: "Get import job status",
  tags: ["Imports"],
});

const columnMappingSuggest = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/column-map",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: columnMappingResponseSchema } },
      description: "AI-inferred column mapping",
    },
    404: { description: "Import job not found" },
  },
  summary: "Suggest column mapping (Step 2)",
  tags: ["Imports"],
});

const columnMappingConfirm = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/column-map",
  request: {
    body: { content: { "application/json": { schema: confirmColumnMappingBodySchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Mapping confirmed; rows staged",
    },
  },
  summary: "Confirm column mapping",
  tags: ["Imports"],
});

const accountMappingSuggest = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/account-map",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: accountSuggestionsResponseSchema } },
      description: "Account suggestions",
    },
    404: { description: "Import job not found" },
  },
  summary: "Suggest account mapping (Step 3)",
  tags: ["Imports"],
});

const accountMappingConfirm = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/account-map",
  request: {
    body: { content: { "application/json": { schema: confirmAccountMappingBodySchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Account mapping confirmed",
    },
  },
  summary: "Confirm account mapping",
  tags: ["Imports"],
});

const categoryMappingSuggest = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/category-map",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuggestionsResponseSchema } },
      description: "Category suggestions",
    },
  },
  summary: "Suggest category mapping (Step 4)",
  tags: ["Imports"],
});

const categoryMappingConfirm = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/category-map",
  request: {
    body: { content: { "application/json": { schema: confirmCategoryMappingBodySchema } } },
    params: importJobIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Category mapping confirmed",
    },
  },
  summary: "Confirm category mapping",
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
    409: { description: "Job not ready for commit" },
  },
  summary: "Commit staged rows into transactions",
  tags: ["Imports"],
});

const cancel = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/cancel",
  request: { params: importJobIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Cancellation requested",
    },
  },
  summary: "Cancel an in-progress commit",
  tags: ["Imports"],
});

const importsRouter = new OpenAPIHono<AppEnv>()
  .openapi(status, async (c) => {
    const { id } = c.req.valid("param");
    const result = await getImportJobStatus(c.var.user.id, id);
    if (!result) {
      return c.json({ error: "Import job not found" }, 404);
    }
    return c.json(result, 200);
  })
  .openapi(columnMappingSuggest, async (c) => {
    const { id } = c.req.valid("param");
    const headers = await getRawRowsHeaders(id);
    const sampleRows = await getRawSampleRows(id, 20);
    if (headers.length === 0) {
      return c.json({ error: "No raw rows for job" }, 404);
    }
    const cached = await lookupColumnMappingCache(c.var.user.id, headers);
    const mapping = cached ?? (await runCsvColumnMappingAgent({ headers, rows: sampleRows }));
    return c.json({ fromCache: cached !== null, headers, mapping, sampleRows }, 200);
  })
  .openapi(columnMappingConfirm, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await confirmColumnMapping(c.var.user.id, id, body);
    return c.json({ message: "Column mapping confirmed", success: true }, 200);
  })
  .openapi(accountMappingSuggest, async (c) => {
    const { id } = c.req.valid("param");
    const job = await db.query.importJob.findFirst({
      columns: { schemaMapping: true, userId: true },
      where: { id: { eq: id } },
    });
    if (!job || job.userId !== c.var.user.id) {
      return c.json({ error: "Import job not found" }, 404);
    }
    const path = job.schemaMapping?.account ? "A" : "B";
    const labels = path === "A" ? await getStagedAccountLabels(id) : ["Default"];
    const accountRows = await db.query.financialAccount.findMany({
      columns: {
        customName: true,
        id: true,
        institutionName: true,
        mask: true,
        name: true,
        officialName: true,
        subtype: true,
        type: true,
      },
      where: { userId: { eq: c.var.user.id } },
      with: {
        plaidConnection: { columns: { institutionName: true } },
      },
    });
    const userAccounts = accountRows.map((a) => ({
      customName: a.customName,
      id: a.id,
      institutionName: a.institutionName ?? a.plaidConnection?.institutionName ?? null,
      mask: a.mask,
      name: a.name,
      officialName: a.officialName,
      subtype: a.subtype,
      type: a.type,
    }));
    const suggestions =
      path === "A" ? await suggestAccountLabels(c.var.user.id, labels, userAccounts) : [];
    return c.json({ path, sourceLabels: labels, suggestions }, 200);
  })
  .openapi(accountMappingConfirm, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await confirmAccountMapping(c.var.user.id, id, body);
    return c.json({ message: "Account mapping confirmed", success: true }, 200);
  })
  .openapi(categoryMappingSuggest, async (c) => {
    const { id } = c.req.valid("param");
    const labels = await getStagedCategoryLabels(id);
    const userCategories = await db.query.category.findMany({
      columns: { id: true, name: true, systemKey: true },
      where: { userId: { eq: c.var.user.id } },
    });
    const suggestions = await suggestCategoryLabels(c.var.user.id, labels, userCategories);
    return c.json({ sourceLabels: labels, suggestions, userCategories }, 200);
  })
  .openapi(categoryMappingConfirm, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await confirmCategoryMapping(c.var.user.id, id, body);
    return c.json({ message: "Category mapping confirmed", success: true }, 200);
  })
  .openapi(commit, async (c) => {
    const { id } = c.req.valid("param");
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
    await start(importCommitWorkflow, [{ jobId: id, userId: c.var.user.id }]);
    return c.json({ message: "Commit in progress", success: true }, 200);
  })
  .openapi(cancel, async (c) => {
    const { id } = c.req.valid("param");
    await requestCancel(c.var.user.id, id);
    return c.json({ message: "Cancel requested", success: true }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const form = await c.req.parseBody({ all: false });
    const { file } = form;
    if (!(file instanceof File)) {
      return c.json({ error: "Missing 'file' field" }, 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ error: "File exceeds upload limit" }, 413);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const { uploadAndStageImport } =
        await import("@cobalt-web/server-data/import/upload/actions");
      const { headers, jobId, sampleRows, totalRows } = await uploadAndStageImport({
        buffer,
        filename: file.name,
        userId: c.var.user.id,
      });
      return c.json(uploadResponseSchema.parse({ headers, id: jobId, sampleRows, totalRows }), 201);
    } catch (error) {
      if (error instanceof ImportGateError) {
        return c.json({ code: error.code, error: error.message }, 400);
      }
      const message = error instanceof Error ? error.message : "Upload failed";
      return c.json({ error: message }, 400);
    }
  });

/**
 * Cache-then-agent orchestration: cached labels short-circuit AI; only the
 * uncached subset is passed to the agent. Result is the union, tagged with
 * `fromCache` for UI confidence display.
 */
async function suggestAccountLabels(
  userId: string,
  sourceLabels: string[],
  userAccounts: {
    customName: string | null;
    id: string;
    institutionName: string | null;
    mask: string | null;
    name: string;
    officialName: string | null;
    subtype: string | null;
    type: string;
  }[],
): Promise<(AccountSuggestion & { fromCache: boolean })[]> {
  const cacheMap = await lookupAccountMappingCache(userId, sourceLabels);
  const cached: (AccountSuggestion & { fromCache: boolean })[] = [];
  const uncached: string[] = [];
  for (const label of sourceLabels) {
    if (cacheMap.has(label)) {
      const accountId = cacheMap.get(label) ?? null;
      cached.push({
        confidence: 1,
        fromCache: true,
        sourceLabel: label,
        target: accountId ?? "skip",
      });
    } else {
      uncached.push(label);
    }
  }
  if (uncached.length === 0) {
    return cached;
  }
  const fresh = await runCsvAccountMappingAgent({ sourceLabels: uncached, userAccounts });
  return [...cached, ...fresh.map((s) => ({ ...s, fromCache: false }))];
}

async function suggestCategoryLabels(
  userId: string,
  sourceLabels: string[],
  userCategories: { id: string; name: string; systemKey: string | null }[],
): Promise<(CategorySuggestion & { fromCache: boolean })[]> {
  const cacheMap = await lookupCategoryMappingCache(userId, sourceLabels);
  const cached: (CategorySuggestion & { fromCache: boolean })[] = [];
  const uncached: string[] = [];
  for (const label of sourceLabels) {
    const hit = cacheMap.get(label);
    if (hit) {
      cached.push({
        action: hit.action,
        confidence: 1,
        fromCache: true,
        newName: hit.newName ?? undefined,
        sourceLabel: label,
        targetCategoryId: hit.targetCategoryId,
      });
    } else {
      uncached.push(label);
    }
  }
  if (uncached.length === 0) {
    return cached;
  }
  const fresh = await runCsvCategoryMappingAgent({ sourceLabels: uncached, userCategories });
  return [...cached, ...fresh.map((s) => ({ ...s, fromCache: false }))];
}

void z;

export { importsRouter };
