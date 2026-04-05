import { sql } from "drizzle-orm";

import { ALLOWED_TABLES } from "../constants.js";
import { agentDb } from "../services/agent-db.js";

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
  const result = await agentDb.execute(
    sql`SELECT
          kcu.table_name   AS source_table,
          kcu.column_name  AS source_column,
          ccu.table_name   AS target_table,
          ccu.column_name  AS target_column,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND kcu.table_name = ANY(${allowedTableNames})
        ORDER BY kcu.table_name, kcu.column_name`
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
