import { sql } from "drizzle-orm";

import { MAX_ROWS, QUERY_TIMEOUT_MS } from "../constants.js";
import { agentDb } from "./agent-db.js";

const READ_ONLY_KEYWORDS = /^\s*(select|with)\s+/i;
const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|create|alter|truncate|grant|revoke|execute|copy|lock|comment|reindex|cluster|discard|fetch|close|move|listen|notify|prepare|reassign|reset|unlisten|vacuum)\b/i;
const FORBIDDEN_SET_ROLE = /\bset\s+role\b/i;
const FORBIDDEN_FUNCTIONS =
  /\b(pg_read_file|pg_read_binary_file|lo_import|lo_export|pg_ls_dir|pg_stat_file|dblink|dblink_exec|pg_sleep)\b/i;

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
  return true;
}

function ensureSingleStatement(normalizedQuery: string): string {
  const trimmedTrailing = normalizedQuery.replaceAll(/;+\s*$/g, "").trim();
  if (trimmedTrailing.includes(";")) {
    throw new Error("Only a single SQL statement is allowed.");
  }
  return trimmedTrailing;
}

function enforceLimit(query: string, limit: number): string {
  const hasLimit = /\bLIMIT\s+\d+/i.test(query);
  if (!hasLimit) {
    return `${query.trim()} LIMIT ${limit}`;
  }
  return query;
}

export function safeReadOnlyQuery(
  query: string,
  limit: number = MAX_ROWS
): string {
  const normalized = normalizeQuery(query);
  if (!isReadOnlyQuery(normalized)) {
    throw new Error(
      "Only read-only queries are allowed (SELECT or WITH). Destructive or write operations, dangerous functions, and role changes are rejected."
    );
  }
  const singleStatement = ensureSingleStatement(normalized);
  return enforceLimit(singleStatement, limit);
}

export async function executeAgentQuery(
  userId: string,
  query: string
): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
  const claims = JSON.stringify({ role: "authenticated", sub: userId });
  const escapedClaims = claims.replaceAll("'", "''");
  const timeoutSeconds = Math.ceil(QUERY_TIMEOUT_MS / 1000);

  const result = await agentDb.transaction(async (tx) => {
    await tx.execute(
      sql.raw(`SET LOCAL statement_timeout = '${String(timeoutSeconds)}s'`)
    );
    await tx.execute(
      sql.raw(`SET LOCAL request.jwt.claims TO '${escapedClaims}'`)
    );

    const queryResult = await tx.execute(sql.raw(query));
    const rows = Array.isArray(queryResult.rows)
      ? queryResult.rows
      : ((queryResult as { rows?: unknown[] }).rows ?? []);

    return rows as Record<string, unknown>[];
  });

  const columns =
    result.length > 0 ? Object.keys(result[0] as Record<string, unknown>) : [];

  return { columns, rows: result };
}
