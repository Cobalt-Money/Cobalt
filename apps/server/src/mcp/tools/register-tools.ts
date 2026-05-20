import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COBALT_SDK_DESCRIPTION } from "../../ai/agents/finance-agent/sdk-description.js";
import { executeCode } from "./execute-code.js";

/**
 * Tool registration is scope-gated: `cobalt_get_session_subject` only needs
 * the token to be valid (identity), but `cobalt_execute_code` exposes the
 * full `cobalt.*` SDK and so requires `cobalt:read`. Per-mutator gating
 * behind `cobalt:write` happens inside the SDK runtime (not yet wired —
 * tracked as Phase 3 of SRI-339 #2'); for now any client with `cobalt:read`
 * can also write through this tool if its token additionally carries
 * `cobalt:write`.
 */
export function registerMcpTools(server: McpServer, userId: string, scopes: string[]): void {
  server.registerTool(
    "cobalt_get_session_subject",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description: "Returns the Cobalt user id (`sub`) for the current OAuth access token.",
      inputSchema: z.object({}),
      title: "Session subject",
    },
    () => ({
      content: [{ text: JSON.stringify({ sub: userId }), type: "text" as const }],
    }),
  );

  if (scopes.includes("cobalt:read")) {
    server.registerTool(
      "cobalt_execute_code",
      {
        annotations: { destructiveHint: false, readOnlyHint: false },
        description: COBALT_SDK_DESCRIPTION,
        inputSchema: z.object({
          code: z
            .string()
            .min(1)
            .describe(
              "JavaScript source (no TypeScript syntax). Top-level await is supported. `cobalt.*` is preinjected — do not import it.",
            ),
        }),
        title: "Execute code",
      },
      ({ code }) => executeCode(userId, code),
    );
  }
}
