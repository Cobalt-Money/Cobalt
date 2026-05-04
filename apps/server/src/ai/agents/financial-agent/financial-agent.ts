import type { InferAgentUIMessage, ToolSet } from "ai";
import { ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";

import { gatewayModel, getProviderOptions, parseModelWithReasoning } from "../../model-provider.js";
import type { ReasoningEffort } from "../../model-provider.js";

const DEFAULT_MODEL = "anthropic/claude-opus-4.7";

/**
 * Placeholder financial-planning agent. No tools wired yet — add a `tools/`
 * subfolder and register them here when the scope is defined.
 */
export function createFinancialAgent(
  model?: string,
  _userId?: string,
  effort: ReasoningEffort = "high",
) {
  const rawModel = model ?? DEFAULT_MODEL;
  const { baseModel: resolvedModel, useReasoning } = parseModelWithReasoning(rawModel);
  const providerOptions = getProviderOptions(resolvedModel, useReasoning, effort);

  type AgentProviderOptions = NonNullable<
    ConstructorParameters<typeof ToolLoopAgent>[0]["providerOptions"]
  >;

  return new ToolLoopAgent({
    callOptionsSchema: z.object({
      currentDate: z.string(),
      currentDateFormatted: z.string(),
      platform: z.enum(["web", "mobile"]),
    }),
    experimental_telemetry: {
      functionId: "financial-agent",
      isEnabled: true,
    },
    instructions: `Your name is Cobalt, a financial planning assistant. This agent is a placeholder — implementation is pending.`,
    maxOutputTokens: 4096,
    model: gatewayModel(resolvedModel),
    ...(providerOptions && {
      providerOptions: providerOptions as AgentProviderOptions,
    }),
    stopWhen: stepCountIs(20),
    tools: {} as ToolSet,
  });
}

type FinancialAgentInstance = ReturnType<typeof createFinancialAgent>;
export type FinancialAgentUIMessage = InferAgentUIMessage<FinancialAgentInstance>;
