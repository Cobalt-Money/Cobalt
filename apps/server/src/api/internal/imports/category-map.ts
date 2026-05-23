import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { confirmCategoryMapping } from "@cobalt-web/server-data/imports/category-mapping/actions";
import { lookupCategoryMappingCache } from "@cobalt-web/server-data/imports/category-mapping/cache";
import {
  getJob,
  getStagedCategoryLabels,
  listCategories,
  listCategoryGroups,
} from "@cobalt-web/server-data/imports/category-mapping/queries";
import { persistCategorySuggestions } from "@cobalt-web/server-data/imports/_shared/mutations";
import {
  categorySuggestionsResponseSchema,
  confirmCategoryMappingSchema,
  importJobIdParamSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/imports/_shared/schemas";
import type { CategorySuggestionsResponse } from "@cobalt-web/server-data/imports/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import type { CategorySuggestion } from "../../../ai/agents/import/csv-category-mapping/csv-category-mapping-agent.js";
import { runCsvCategoryMappingAgent } from "../../../ai/agents/import/csv-category-mapping/csv-category-mapping-agent.js";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const suggestRoute = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/category-map",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(categorySuggestionsResponseSchema, "Category suggestions"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Import job not found"),
  },
  summary: "Suggest category mapping (Step 4)",
  tags: ["Imports"],
});

const confirmRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/category-map",
  request: {
    body: {
      content: {
        "application/json": { schema: confirmCategoryMappingSchema },
      },
    },
    params: importJobIdParamSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Category mapping confirmed"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Confirm category mapping",
  tags: ["Imports"],
});

/**
 * Reuse the user's prior confirmed decision for a label. A "link" hit is re-validated
 * against current categories; a legacy "create" hit is re-pointed to an existing
 * same-named category if one now exists; anything stale → AI re-infer.
 */
export async function suggestCategoryLabels(
  userId: string,
  sourceLabels: string[],
  userCategories: { id: string; name: string; systemKey: string | null }[],
): Promise<(CategorySuggestion & { fromCache: boolean })[]> {
  const byId = new Map(userCategories.map((cat) => [cat.id, cat]));
  const byName = new Map(userCategories.map((cat) => [cat.name.trim().toLowerCase(), cat]));
  const cached = await lookupCategoryMappingCache(userId, sourceLabels);
  const cachedSuggestions: (CategorySuggestion & { fromCache: boolean })[] = [];
  const uncached: string[] = [];
  for (const label of sourceLabels) {
    const hit = cached.get(label);
    if (!hit) {
      uncached.push(label);
      continue;
    }
    if (hit.action === "skip") {
      cachedSuggestions.push({
        action: "skip",
        confidence: 1,
        fromCache: true,
        sourceLabel: label,
        targetCategoryId: null,
      });
      continue;
    }
    if (hit.action === "link" && hit.targetCategoryId && byId.has(hit.targetCategoryId)) {
      cachedSuggestions.push({
        action: "link",
        confidence: 1,
        fromCache: true,
        sourceLabel: label,
        targetCategoryId: hit.targetCategoryId,
      });
      continue;
    }
    if (hit.action === "create" && hit.newName) {
      const existing = byName.get(hit.newName.trim().toLowerCase());
      if (existing) {
        cachedSuggestions.push({
          action: "link",
          confidence: 1,
          fromCache: true,
          sourceLabel: label,
          targetCategoryId: existing.id,
        });
        continue;
      }
    }
    uncached.push(label);
  }
  if (uncached.length === 0) {
    return cachedSuggestions;
  }
  const fresh = await runCsvCategoryMappingAgent({
    sourceLabels: uncached,
    userCategories,
  });
  return [...cachedSuggestions, ...fresh.map((s) => ({ ...s, fromCache: false }))];
}

export const importsCategoryMapRouter = createApp()
  .openapi(suggestRoute, async (c) => {
    const { id } = c.req.valid("param");
    const labels = await getStagedCategoryLabels(id);
    const userCategories = await listCategories(c.var.user.id);
    const userGroups = await listCategoryGroups(c.var.user.id);
    const job = await getJob(c.var.user.id, id);
    const userCategoryIdSet = new Set(userCategories.map((cat) => cat.id));
    // Stale guard: any cached link target whose category was deleted → re-infer.
    // Legacy create-action entries from prior sessions also force re-infer.
    const categoryCacheValid =
      job.categorySuggestions !== null &&
      job.categorySuggestions !== undefined &&
      job.categorySuggestions.every((s) => {
        if (s.action === "link") {
          return s.targetCategoryId !== null && userCategoryIdSet.has(s.targetCategoryId);
        }
        if (s.action === "skip") {
          return true;
        }
        return false;
      });
    if (categoryCacheValid && job.categorySuggestions) {
      const body: CategorySuggestionsResponse = {
        sourceLabels: labels,
        suggestions: job.categorySuggestions as CategorySuggestionsResponse["suggestions"],
        userCategories,
        userGroups,
      };
      return c.json(categorySuggestionsResponseSchema.parse(body), 200);
    }
    const suggestions = await suggestCategoryLabels(c.var.user.id, labels, userCategories);
    await persistCategorySuggestions(id, suggestions);
    const body: CategorySuggestionsResponse = {
      sourceLabels: labels,
      suggestions: suggestions as CategorySuggestionsResponse["suggestions"],
      userCategories,
      userGroups,
    };
    return c.json(categorySuggestionsResponseSchema.parse(body), 200);
  })
  .openapi(confirmRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await confirmCategoryMapping(c.var.user.id, id, body);
    return c.json(
      successResponseSchema.parse({ message: "Category mapping confirmed", success: true }),
      200,
    );
  });
