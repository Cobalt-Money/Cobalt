import { agentDb } from "@cobalt-web/db/agent";
import { tool } from "ai";
import type { UIToolInvocation } from "ai";
import { sql } from "drizzle-orm";
import { z } from "zod";

const READ_ONLY_KEYWORDS = /^\s*(select|with)\s+/i;
const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|create|alter|truncate|grant|revoke|execute|copy|lock|comment|reindex|cluster|discard|fetch|close|move|listen|notify|prepare|reassign|reset|unlisten|vacuum)\b/i;
const FORBIDDEN_SET_ROLE = /\bset\s+role\b/i;
const FORBIDDEN_FUNCTIONS =
  /\b(pg_read_file|pg_read_binary_file|lo_import|lo_export|pg_ls_dir|pg_stat_file|dblink|dblink_exec|pg_sleep)\b/i;
const FORBIDDEN_SCHEMA_ACCESS = /\b(information_schema|pg_catalog)\b/i;

function normalizeQuery(query: string): string {
  return query
    .replaceAll(/--[^\n]*/g, "")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function isReadOnlyQuery(normalizedQuery: string): boolean {
  if (!READ_ONLY_KEYWORDS.test(normalizedQuery)) {
    return false;
  }
  if (FORBIDDEN_KEYWORDS.test(normalizedQuery)) {
    return false;
  }
  if (FORBIDDEN_SET_ROLE.test(normalizedQuery)) {
    return false;
  }
  if (FORBIDDEN_FUNCTIONS.test(normalizedQuery)) {
    return false;
  }
  if (FORBIDDEN_SCHEMA_ACCESS.test(normalizedQuery)) {
    return false;
  }
  return true;
}

function ensureSingleStatement(normalizedQuery: string): string {
  const trimmed = normalizedQuery.replaceAll(/;+\s*$/g, "").trim();
  if (trimmed.includes(";")) {
    throw new Error("Only a single SQL statement is allowed.");
  }
  return trimmed;
}

function enforceLimit(query: string): string {
  if (!/\bLIMIT\s+\d+/i.test(query)) {
    return `${query.trim()} LIMIT 1000`;
  }
  return query;
}

function safeReadOnlyQuery(query: string): string {
  const normalized = normalizeQuery(query);
  if (!isReadOnlyQuery(normalized)) {
    throw new Error(
      "Only read-only queries are allowed (SELECT or WITH). Destructive or write operations, dangerous functions, and system catalog access are rejected.",
    );
  }
  return enforceLimit(ensureSingleStatement(normalized));
}

/** User-scoped SQL tool — RLS enforced via SET LOCAL request.jwt.claims. */
export function createRunSqlTool(userId: string) {
  return tool({
    description:
      "Execute a read-only SQL query (SELECT or WITH) against the application database. Use after discovering schema via bash/readFile from the workspace. Queries are automatically scoped to the current user's data via RLS.",
    execute: async ({ query }) => {
      const safeQuery = safeReadOnlyQuery(query);
      try {
        const claims = JSON.stringify({ role: "authenticated", sub: userId });
        const escapedClaims = claims.replaceAll("'", "''");
        const result = await agentDb.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
          await tx.execute(sql.raw(`SET LOCAL request.jwt.claims TO '${escapedClaims}'`));
          const queryResult = await tx.execute(sql.raw(safeQuery));
          const rows = Array.isArray(queryResult.rows)
            ? queryResult.rows
            : ((queryResult as { rows?: unknown[] }).rows ?? []);
          return { rows: rows.slice(0, 1000) };
        });
        return result;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error), { cause: error });
      }
    },
    inputSchema: z.object({
      query: z.string().describe("The SQL query to run (SELECT or WITH only)."),
    }),
  });
}

/** Fallback SQL tool when userId is unavailable (dev/testing only). */
export const runSqlTool = tool({
  description: "Execute a read-only SQL query (SELECT or WITH) against the application database.",
  execute: async ({ query }) => {
    const safeQuery = safeReadOnlyQuery(query);
    try {
      const result = await agentDb.execute(sql.raw(safeQuery));
      const rows = Array.isArray(result.rows)
        ? result.rows
        : ((result as { rows?: unknown[] }).rows ?? []);
      return { rows: rows.slice(0, 1000) };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error), {
        cause: error,
      });
    }
  },
  inputSchema: z.object({
    query: z.string().describe("The SQL query to run (SELECT or WITH only)."),
  }),
});

export type RunSqlToolInvocation = UIToolInvocation<typeof runSqlTool>;
