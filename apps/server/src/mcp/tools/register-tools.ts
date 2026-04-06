import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ALLOWED_TABLES, MAX_ROWS } from "../constants.js";
import { runQuery } from "./query.js";
import { describeTable, getRelationships, listTables } from "./schema.js";

const allowedTableNames = Object.keys(ALLOWED_TABLES);

export function registerMcpTools(server: McpServer, userId: string): void {
  server.registerTool(
    "cobalt_get_session_subject",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description:
        "Returns the Cobalt user id (`sub`) for the current OAuth access token.",
      inputSchema: z.object({}),
      title: "Session subject",
    },
    () => ({
      content: [
        { text: JSON.stringify({ sub: userId }), type: "text" as const },
      ],
    })
  );

  server.registerTool(
    "cobalt_list_tables",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description:
        "List all available database tables and their descriptions. Call this first to discover what data is available.",
      inputSchema: z.object({}),
      title: "List tables",
    },
    () => listTables()
  );

  server.registerTool(
    "cobalt_describe_table",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description:
        "Get column names, data types, and nullability for a specific table. Use after cobalt_list_tables to understand table structure before writing queries.",
      inputSchema: z.object({
        table: z
          .enum(allowedTableNames as [string, ...string[]])
          .describe("Table name from cobalt_list_tables"),
      }),
      title: "Describe table",
    },
    ({ table }) => describeTable(table)
  );

  server.registerTool(
    "cobalt_get_relationships",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description:
        "Get foreign key relationships between tables. Useful for understanding how to JOIN tables in queries.",
      inputSchema: z.object({}),
      title: "Get relationships",
    },
    () => getRelationships()
  );

  server.registerTool(
    "cobalt_query",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description:
        "Execute a read-only SQL query (SELECT or WITH) against the user's financial data. Results are automatically scoped to the authenticated user via row-level security. Use cobalt_list_tables and cobalt_describe_table first to understand the schema.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_ROWS)
          .optional()
          .describe(
            `Max rows to return (default 100, max ${String(MAX_ROWS)})`
          ),
        query: z.string().describe("SQL query (SELECT or WITH only)"),
      }),
      title: "Query data",
    },
    ({ query, limit }) => runQuery(userId, query, limit)
  );
}
