import { env } from "@cobalt-web/env/server";
import { generateObject } from "ai";
import pLimit from "p-limit";
import { z } from "zod";

import { gatewayModel } from "../../model-provider.js";

const HAIKU = "anthropic/claude-haiku-4.5";
const SINGLE_CALL_THRESHOLD = 20;
const BATCH_SIZE = 12;
const PARALLEL = 5;

export interface CategorySuggestion {
  sourceLabel: string;
  action: "link" | "linkRename" | "create" | "skip";
  targetCategoryId: string | null;
  newName?: string;
  newCategory?: { name: string; iconKey: string; color?: string };
  confidence: number;
}

/**
 * Build the per-call AI schema for category label resolution.
 *   action="link"        → targetCategoryId required, must be a real id
 *   action="linkRename"  → targetCategoryId required + newName for category.name override
 *   action="create"      → newCategory required (will be inserted at commit)
 *   action="skip"        → no target; rows fall through to "uncategorized"
 */
function makeCategoryLabelSchema(categoryIds: string[]) {
  const values: [string, ...string[]] = ["__none__", ...categoryIds];
  const targetEnum = z.enum(values);
  return z.object({
    decisions: z.array(
      z
        .object({
          action: z.enum(["link", "linkRename", "create", "skip"]),
          confidence: z.number().min(0).max(1),
          newCategory: z
            .object({
              color: z.string().optional(),
              iconKey: z.string(),
              name: z.string(),
            })
            .optional(),
          newName: z.string().optional(),
          sourceLabel: z.string(),
          targetCategoryId: targetEnum,
        })
        .refine(
          (d) => {
            if (d.action === "link" || d.action === "linkRename") {
              return d.targetCategoryId !== "__none__";
            }
            if (d.action === "create") {
              return d.newCategory !== undefined;
            }
            return true;
          },
          { message: "Action requires the matching target/newCategory field." },
        ),
    ),
  });
}

/**
 * Per-label category suggestions.
 *
 *   ≤20 distinct labels → single Haiku call.
 *   >20                 → batches of 12, parallel `p-limit(5)`.
 *
 * Each batch sees the user's full category list so model anchors are
 * consistent across batches. Pure agent: caller owns cache lookup/persist.
 */
export async function runCsvCategoryMappingAgent({
  sourceLabels,
  userCategories,
}: {
  sourceLabels: string[];
  userCategories: { id: string; name: string; systemKey: string | null }[];
}): Promise<CategorySuggestion[]> {
  if (sourceLabels.length === 0) {
    return [];
  }
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  if (sourceLabels.length <= SINGLE_CALL_THRESHOLD) {
    return await callBatch(sourceLabels, userCategories);
  }

  const batches: string[][] = [];
  for (let i = 0; i < sourceLabels.length; i += BATCH_SIZE) {
    batches.push(sourceLabels.slice(i, i + BATCH_SIZE));
  }
  const limit = pLimit(PARALLEL);
  const settled = await Promise.all(batches.map((b) => limit(() => callBatch(b, userCategories))));
  return settled.flat();
}

async function callBatch(
  labels: string[],
  userCategories: { id: string; name: string; systemKey: string | null }[],
): Promise<CategorySuggestion[]> {
  const ids = userCategories.map((c) => c.id);
  const schema = makeCategoryLabelSchema(ids.length > 0 ? ids : ["__none__"]);
  const result = await generateObject({
    experimental_telemetry: {
      functionId: "csv-category-mapping-agent",
      isEnabled: true,
    },
    model: gatewayModel(HAIKU),
    prompt: [
      "Map each source category label to a Cobalt category.",
      'Use action="link" to map to an existing category. Use action="linkRename" if the label suggests renaming the Cobalt category for clarity (provide newName).',
      'Use action="create" with newCategory if no existing category fits — pick an iconKey (e.g. "shopping-bag", "utensils", "home") and optional color hex.',
      'Use action="skip" only when the label is meaningless (blank, "", "--").',
      "",
      `Source labels: ${JSON.stringify(labels)}`,
      `User Cobalt categories: ${JSON.stringify(userCategories)}`,
    ].join("\n"),
    schema,
  });
  return result.object.decisions
    .filter((d) => labels.includes(d.sourceLabel))
    .map((d) => ({
      action: d.action,
      confidence: d.confidence,
      newCategory: d.newCategory,
      newName: d.newName,
      sourceLabel: d.sourceLabel,
      targetCategoryId: d.targetCategoryId === "__none__" ? null : d.targetCategoryId,
    }));
}
