import { env } from "@cobalt-web/env/server";
import { generateObject } from "ai";
import { z } from "zod";

import { gatewayModel } from "../../model-provider.js";

const HAIKU = "anthropic/claude-haiku-4.5";

export interface AccountSuggestion {
  sourceLabel: string;
  /** Existing Cobalt accountId, or sentinel for create/skip flow. */
  target: string | "create_new" | "skip";
  /** Suggested initial name when target = "create_new". */
  newName?: string;
  confidence: number;
}

/**
 * Build the per-call AI schema for account label resolution. Output is
 * enum-constrained to actual user-account IDs + sentinels — invented IDs
 * fail zod parse (model can't hallucinate them past the boundary).
 */
function makeAccountLabelSchema(accountIds: string[]) {
  const values: [string, ...string[]] = ["create_new", "skip", ...accountIds];
  const targetEnum = z.enum(values);
  return z.object({
    decisions: z.array(
      z.object({
        confidence: z.number().min(0).max(1),
        newName: z.string().optional(),
        sourceLabel: z.string(),
        target: targetEnum,
      }),
    ),
  });
}

/**
 * Per-label account suggestions. Pure agent: one Haiku call, zod-validated
 * against the user's actual account IDs. Caller owns cache lookup/persist.
 */
export async function runCsvAccountMappingAgent({
  sourceLabels,
  userAccounts,
}: {
  sourceLabels: string[];
  userAccounts: { id: string; name: string; type: string }[];
}): Promise<AccountSuggestion[]> {
  if (sourceLabels.length === 0) {
    return [];
  }
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  const ids = userAccounts.map((a) => a.id);
  const schema = makeAccountLabelSchema(ids.length > 0 ? ids : ["__none__"]);
  const result = await generateObject({
    experimental_telemetry: {
      functionId: "csv-account-mapping-agent",
      isEnabled: true,
    },
    model: gatewayModel(HAIKU),
    prompt: [
      "Match each source-account label to one of the user's Cobalt accounts.",
      'If no Cobalt account is a clear fit, return target="create_new" and suggest a newName.',
      'If the label looks like a non-account marker (e.g. blank, summary row), return target="skip".',
      "",
      `Source labels: ${JSON.stringify(sourceLabels)}`,
      `User Cobalt accounts: ${JSON.stringify(userAccounts)}`,
    ].join("\n"),
    schema,
  });

  return result.object.decisions.map((d) => ({
    confidence: d.confidence,
    newName: d.newName,
    sourceLabel: d.sourceLabel,
    target: d.target as string,
  }));
}
