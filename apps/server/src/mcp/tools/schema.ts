import { agentDb } from "@cobalt-web/db/agent";
import { sql } from "drizzle-orm";

import { ALLOWED_TABLES } from "../constants.js";

const allowedTableNames = Object.keys(ALLOWED_TABLES);

export function listTables(): { content: { text: string; type: "text" }[] } {
  const tables = Object.entries(ALLOWED_TABLES).map(([name, description]) => ({
    description,
    name,
  }));
  return {
    content: [
      { text: JSON.stringify({ tables }, null, 2), type: "text" as const },
    ],
  };
}

export async function describeTable(
  table: string
): Promise<{ content: { text: string; type: "text" }[] }> {
  if (!allowedTableNames.includes(table)) {
    throw new Error(
      `Table "${table}" is not in the allowlist. Use cobalt_list_tables to see available tables.`
    );
  }

  const result = await agentDb.execute(
    sql`SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
        ORDER BY ordinal_position`
  );

  const columns = (result.rows as Record<string, unknown>[]).map((row) => ({
    column_name: row.column_name,
    data_type: row.data_type,
    is_nullable: row.is_nullable,
  }));

  return {
    content: [
      {
        text: JSON.stringify({ columns, table }, null, 2),
        type: "text" as const,
      },
    ],
  };
}

export async function getRelationships(): Promise<{
  content: { text: string; type: "text" }[];
}> {
  // Use pg_catalog instead of information_schema to avoid privilege restrictions
  // on constraint_column_usage (which only shows constraints owned by the current
  // role, not those merely accessible via SELECT grants / RLS).
  // Use sql.join + IN(...) instead of = ANY(...) because drizzle serializes arrays
  // as a tuple ($1, $2, ...) which is invalid syntax for ANY().
  const tableList = sql.join(
    allowedTableNames.map((t) => sql`${t}`),
    sql`, `
  );
  const result = await agentDb.execute(
    sql`SELECT
          src.relname  AS source_table,
          a.attname    AS source_column,
          tgt.relname  AS target_table,
          fa.attname   AS target_column,
          c.conname    AS constraint_name
        FROM pg_constraint c
        JOIN pg_class src ON src.oid = c.conrelid
        JOIN pg_class tgt ON tgt.oid = c.confrelid
        JOIN pg_namespace n ON n.oid = src.relnamespace
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        JOIN pg_attribute fa
          ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
        WHERE c.contype = 'f'
          AND n.nspname = 'public'
          AND src.relname IN (${tableList})
        ORDER BY src.relname, a.attname`
  );

  const relationships = (result.rows as Record<string, unknown>[]).map(
    (row) => ({
      constraint_name: row.constraint_name,
      source_column: row.source_column,
      source_table: row.source_table,
      target_column: row.target_column,
      target_table: row.target_table,
    })
  );

  return {
    content: [
      {
        text: JSON.stringify({ relationships }, null, 2),
        type: "text" as const,
      },
    ],
  };
}
