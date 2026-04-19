import { createGateway } from "@ai-sdk/gateway";
import { env } from "@cobalt-web/env/server";

/**
 * Single AI Gateway provider for the server — same pattern as
 * https://sdk.vercel.ai/docs/foundations/providers-and-models (explicit API key).
 * Use `gatewayModel("anthropic/claude-…")` anywhere a `model` is required.
 */
export const gatewayModel = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
});

const REASONING_SUFFIX = "+reasoning";

/** Client sends `model+reasoning` when “Think” is on; strip any repeated suffix. */
export function parseModelWithReasoning(modelId: string): {
  baseModel: string;
  useReasoning: boolean;
} {
  let baseModel = modelId;
  let useReasoning = false;
  while (baseModel.endsWith(REASONING_SUFFIX)) {
    useReasoning = true;
    baseModel = baseModel.slice(0, -REASONING_SUFFIX.length);
  }
  return { baseModel, useReasoning };
}

export type ReasoningEffort = "low" | "medium" | "high" | "max";

// Anthropic extended thinking: adaptive (4.6+ opus/sonnet) vs fixed budget (older).
const ADAPTIVE_CLAUDE = /anthropic\/claude-(opus|sonnet)-4\.[6-9]/i;
const BUDGET_CLAUDE =
  /anthropic\/(claude-opus-4|claude-sonnet-4|claude-3-7-sonnet)/i;

export function getProviderOptions(
  baseModel: string,
  useReasoning: boolean,
  effort: ReasoningEffort = "high"
):
  | { anthropic: { thinking: { budgetTokens: number; type: "enabled" } } }
  | { anthropic: { effort: ReasoningEffort; thinking: { type: "adaptive" } } }
  | undefined {
  if (!useReasoning) {
    return undefined;
  }
  if (ADAPTIVE_CLAUDE.test(baseModel)) {
    return {
      anthropic: {
        effort,
        thinking: { type: "adaptive" },
      },
    };
  }
  if (BUDGET_CLAUDE.test(baseModel)) {
    return {
      anthropic: {
        thinking: { budgetTokens: 12_000, type: "enabled" },
      },
    };
  }
  return undefined;
}
