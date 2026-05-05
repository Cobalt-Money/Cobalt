import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { COBALT_SDK_DESCRIPTION } from "../../ai/agents/code-agent/sdk-description.js";
import { executeCode } from "./execute-code.js";

export function registerMcpTools(server: McpServer, userId: string): void {
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
    ({ code }) => executeCode(userId, code),
  );
}
