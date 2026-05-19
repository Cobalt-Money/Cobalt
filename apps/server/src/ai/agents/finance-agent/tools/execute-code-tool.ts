import { tool } from "ai";
import { z } from "zod";

import { runCobaltCode } from "../code-runtime.js";
import { COBALT_SDK_DESCRIPTION } from "../sdk-description.js";

const RUNTIME_NOTES = [
  "",
  "Runtime:",
  "  - Ephemeral V8 isolate sandbox; the Cobalt SDK is preinjected as `cobalt`. Do NOT import it.",
  "  - JS or TS source. TS types are stripped before exec (syntax-only, no type-check) — `: Type`, `as Type`, `interface`, `<Generics>` all OK.",
  "  - Top-level `await` is supported.",
  "  - 3-minute wall-clock budget per call.",
  "  - `console.log` is the only return channel; use `console.log(JSON.stringify(...))` for structured data.",
  "  - Most APIs are read-only. `cobalt.transactions.update` is the only mutator and patches existing rows owned by the user.",
].join("\n");

const description = `${COBALT_SDK_DESCRIPTION}${RUNTIME_NOTES}`;

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
