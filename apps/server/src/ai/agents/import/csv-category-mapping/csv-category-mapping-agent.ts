import { env } from "@cobalt-web/env/server";
import { Output, generateText } from "ai";
import type { LanguageModel } from "ai";
import pLimit from "p-limit";
import { z } from "zod";

import { gatewayModel } from "../../../model-provider.js";

const MODEL = "anthropic/claude-opus-4.7";
const SINGLE_CALL_THRESHOLD = 20;
const BATCH_SIZE = 12;
const PARALLEL = 5;

export interface CategorySuggestion {
  sourceLabel: string;
  action: "link" | "skip";
  targetCategoryId: string | null;
  confidence: number;
}

/**
 * Build the per-call AI schema for category label resolution.
 *   action="link" → targetCategoryId required, must be a real id
 *   action="skip" → no target; rows fall through to "uncategorized"
 */
function makeCategoryLabelSchema(categoryIds: string[]) {
  const values: [string, ...string[]] = ["__none__", ...categoryIds];
  const targetEnum = z.enum(values);
  return z.object({
    decisions: z.array(
      z
        .object({
          action: z.enum(["link", "skip"]),
          confidence: z.number().min(0).max(1),
          sourceLabel: z.string(),
          targetCategoryId: targetEnum,
        })
        .refine(
          (d) => {
            if (d.action === "link") {
              return d.targetCategoryId !== "__none__";
            }
            return true;
          },
          { message: "Action=link requires a real targetCategoryId." },
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
  model,
}: {
  sourceLabels: string[];
  userCategories: { id: string; name: string; systemKey: string | null }[];
  /** Override model. Defaults to gateway primary. Used by tests. */
  model?: LanguageModel;
}): Promise<CategorySuggestion[]> {
  if (sourceLabels.length === 0) {
    return [];
  }
  if (!model && !env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  if (sourceLabels.length <= SINGLE_CALL_THRESHOLD) {
    return await callBatch(sourceLabels, userCategories, model);
  }

  const batches: string[][] = [];
  for (let i = 0; i < sourceLabels.length; i += BATCH_SIZE) {
    batches.push(sourceLabels.slice(i, i + BATCH_SIZE));
  }
  const limit = pLimit(PARALLEL);
  const settled = await Promise.all(
    batches.map((b) => limit(() => callBatch(b, userCategories, model))),
  );
  return settled.flat();
}

async function callBatch(
  labels: string[],
  userCategories: { id: string; name: string; systemKey: string | null }[],
  model?: LanguageModel,
): Promise<CategorySuggestion[]> {
  const ids = userCategories.map((c) => c.id);
  const schema = makeCategoryLabelSchema(ids.length > 0 ? ids : ["__none__"]);
  const result = await generateText({
    experimental_telemetry: {
      functionId: "csv-category-mapping-agent",
      isEnabled: true,
    },
    maxOutputTokens: 10_000,
    model: model ?? gatewayModel(MODEL),
    output: Output.object({ schema }),
    prompt: [
      "Map each source category label to an existing Cobalt category.",
      'Use action="link" for EVERY label — pick the closest-fit existing category, even if the match is loose.',
      'If no specific category fits, link to the user\'s "Uncategorized" system category (systemKey="uncategorized"). This is the catch-all for unmappable labels.',
      'Use action="skip" ONLY for empty strings or literal placeholders ("", "--", "n/a").',
      "Do NOT invent new categories. The available category list is fixed; choose from it.",
      "",
      `Source labels: ${JSON.stringify(labels)}`,
      `User Cobalt categories: ${JSON.stringify(userCategories)}`,
    ].join("\n"),
  });
  return result.output.decisions
    .filter((d) => labels.includes(d.sourceLabel))
    .map((d) => ({
      action: d.action,
      confidence: d.confidence,
      sourceLabel: d.sourceLabel,
      targetCategoryId: d.targetCategoryId === "__none__" ? null : d.targetCategoryId,
    }));
}
