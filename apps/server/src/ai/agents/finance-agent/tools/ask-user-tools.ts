import { tool } from "ai";
import type { UIToolInvocation } from "ai";
import { z } from "zod";

export const askUserTool = tool({
  description:
    "Ask the user a clarifying multiple-choice question when you need more context to proceed accurately. STRICT RULES: (1) Batch ALL needed clarifications into a SINGLE assistant turn via parallel askUser calls — never ask one question, get an answer, then ask another. (2) After receiving askUser answers, proceed directly with the work; do NOT emit additional askUser calls in later turns. (3) Prefer reasonable defaults; only ask when truly blocked and there are 2+ meaningfully distinct paths. Present 2-6 concise options. Do NOT use for yes/no.",
  inputSchema: z.object({
    options: z
      .array(
        z.object({
          description: z
            .string()
            .optional()
            .describe("Optional longer description of what this option means"),
          label: z.string().describe("Display label for the option"),
          value: z.string().describe("Short identifier for this option"),
        }),
      )
      .min(2)
      .max(6)
      .describe("Multiple choice options (2-6)"),
    question: z.string().describe("The clarifying question to ask the user"),
  }),
  // No execute — client-side tool that requires user interaction
});

export type AskUserToolInvocation = UIToolInvocation<typeof askUserTool>;
