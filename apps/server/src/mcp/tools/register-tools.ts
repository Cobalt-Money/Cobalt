import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COBALT_SDK_DESCRIPTION } from "../../ai/agents/finance-agent/sdk-description.js";
import { executeCode } from "./execute-code.js";

/**
 * Tool registration is scope-aware: `cobalt_get_session_subject` only needs
 * the token to be valid (identity), but `cobalt_execute_code` exposes the
 * full `cobalt.*` SDK and so requires `cobalt:read`. Tokens missing the
 * scope still see the tool in `tools/list` and get an explicit
 * `insufficient_scope` error on call (RFC 6750 vocabulary) instead of the
 * SDK's generic "tool not found" — this lets MCP clients surface a
 * re-authorization prompt rather than treating it as a server bug.
 *
 * Per-mutator gating behind `cobalt:write` happens inside the SDK runtime
 * (not yet wired — tracked as Phase 3 of SRI-339 #2').
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
    ({ code }) => {
      if (!scopes.includes("cobalt:read")) {
        return {
          content: [
            {
              text: JSON.stringify({
                error: {
                  error: "insufficient_scope",
                  error_description:
                    "Access token is missing the required scope: cobalt:read. Reauthorize the client requesting the cobalt:read scope.",
                  required_scope: "cobalt:read",
                },
              }),
              type: "text" as const,
            },
          ],
          isError: true,
        };
      }
      return executeCode(userId, code, scopes);
    },
  );
}
