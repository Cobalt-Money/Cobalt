import { tool } from "ai";
import { z } from "zod";

import { runCobaltCode } from "../code-runtime.js";
import { COBALT_SDK_DESCRIPTION } from "../sdk-description.js";

const description = COBALT_SDK_DESCRIPTION;

export const createExecuteCodeTool = (userId: string) =>
  tool({
    description,
    execute: async ({ code }) => {
      const result = await runCobaltCode(userId, code);
      if (!result.ok) {
        return {
          error: result.error ?? { message: "code failed", name: "Error" },
          ok: false,
          stdout: result.stdout,
        };
      }
      return { ok: true, stdout: result.stdout };
    },
    inputSchema: z.object({
      code: z
        .string()
        .min(1)
        .describe(
          "JavaScript source (no TypeScript syntax). Top-level await is supported. `cobalt.*` is preinjected — do not import it.",
        ),
    }),
  });
