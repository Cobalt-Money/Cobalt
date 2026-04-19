import { tool } from "ai";
import type { UIToolInvocation } from "ai";
import { z } from "zod";

export const askUserTool = tool({
  description:
    "Ask the user a clarifying multiple-choice question when you need more context to proceed accurately. Use this when the user's request is ambiguous and there are multiple distinct paths you could take. Present 2-6 concise options. Do NOT use for simple yes/no questions — only when multiple meaningful alternatives exist. You can call this tool multiple times in one turn to ask several questions at once.",
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
        })
      )
      .min(2)
      .max(6)
      .describe("Multiple choice options (2-6)"),
    question: z.string().describe("The clarifying question to ask the user"),
  }),
  // No execute — client-side tool that requires user interaction
});

export type AskUserToolInvocation = UIToolInvocation<typeof askUserTool>;
