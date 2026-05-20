import { confirmAccountMapping } from "@cobalt-web/server-data/import/account-mapping/actions";
import { lookupAccountMappingCache } from "@cobalt-web/server-data/import/account-mapping/cache";
import {
  getJob,
  getStagedAccountLabels,
  listAccounts,
} from "@cobalt-web/server-data/import/account-mapping/queries";
import { persistAccountSuggestions } from "@cobalt-web/server-data/import/shared/mutations";
import {
  accountSuggestionsResponseSchema,
  confirmAccountMappingBodySchema,
  importJobIdParamSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import type { AccountSuggestion } from "../../../ai/agents/import/csv-account-mapping/csv-account-mapping-agent.js";
import { runCsvAccountMappingAgent } from "../../../ai/agents/import/csv-account-mapping/csv-account-mapping-agent.js";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const suggestRoute = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/account-map",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(accountSuggestionsResponseSchema, "Account suggestions"),
    404: { description: "Import job not found" },
  },
  summary: "Suggest account mapping (Step 3)",
  tags: ["Imports"],
});

const confirmRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/account-map",
  request: {
    body: {
      content: {
        "application/json": { schema: confirmAccountMappingBodySchema },
      },
    },
    params: importJobIdParamSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Account mapping confirmed"),
  },
  summary: "Confirm account mapping",
  tags: ["Imports"],
});

/**
 * Cache-then-agent orchestration: cached labels short-circuit AI; only the
 * uncached subset is passed to the agent. Result is the union, tagged with
 * `fromCache` for UI confidence display.
 */
export async function suggestAccountLabels(
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
  const userAccountIdSet = new Set(userAccounts.map((a) => a.id));
  const cached = await lookupAccountMappingCache(userId, sourceLabels);
  const cachedSuggestions: (AccountSuggestion & { fromCache: boolean })[] = [];
  const uncached: string[] = [];
  for (const label of sourceLabels) {
    if (cached.has(label)) {
      const accountId = cached.get(label) ?? null;
      if (accountId === null) {
        // Previously skipped (or cached account deleted — FK is `on delete set null`).
        cachedSuggestions.push({
          confidence: 1,
          fromCache: true,
          sourceLabel: label,
          target: "skip",
        });
        continue;
      }
      if (userAccountIdSet.has(accountId)) {
        cachedSuggestions.push({
          confidence: 1,
          fromCache: true,
          sourceLabel: label,
          target: accountId,
        });
        continue;
      }
      // Cached account no longer exists — fall through to AI re-inference.
    }
    uncached.push(label);
  }
  if (uncached.length === 0) {
    return cachedSuggestions;
  }
  const fresh = await runCsvAccountMappingAgent({
    sourceLabels: uncached,
    userAccounts,
  });
  return [...cachedSuggestions, ...fresh.map((s) => ({ ...s, fromCache: false }))];
}

export const importsAccountMapRouter = createApp()
  .openapi(suggestRoute, async (c) => {
    const { id } = c.req.valid("param");
    const job = await getJob(c.var.user.id, id);
    const path = job.schemaMapping?.account ? "A" : "B";
    const labels = path === "A" ? await getStagedAccountLabels(id) : ["Default"];
    const userAccounts = await listAccounts(c.var.user.id);
    const userAccountIdSet = new Set(userAccounts.map((a) => a.id));
    // Stale guard: any cached suggestion pointing at a deleted account → re-infer.
    const cacheStillValid =
      job.accountSuggestions !== null &&
      job.accountSuggestions !== undefined &&
      job.accountSuggestions.every(
        (s) => s.target === "create_new" || s.target === "skip" || userAccountIdSet.has(s.target),
      );
    if (cacheStillValid && job.accountSuggestions) {
      return c.json({ path, sourceLabels: labels, suggestions: job.accountSuggestions }, 200);
    }
    const suggestions =
      path === "A" ? await suggestAccountLabels(c.var.user.id, labels, userAccounts) : [];
    await persistAccountSuggestions(id, suggestions);
    return c.json({ path, sourceLabels: labels, suggestions }, 200);
  })
  .openapi(confirmRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await confirmAccountMapping(c.var.user.id, id, body);
    return c.json({ message: "Account mapping confirmed", success: true }, 200);
  });
