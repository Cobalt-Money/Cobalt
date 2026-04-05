import { CHARACTER_LIMIT, DEFAULT_ROWS, MAX_ROWS } from "../constants.js";
import {
  executeAgentQuery,
  safeReadOnlyQuery,
} from "../services/query-executor.js";

export async function runQuery(
  userId: string,
  query: string,
  limit?: number
): Promise<{ content: { text: string; type: "text" }[] }> {
  const effectiveLimit = Math.min(limit ?? DEFAULT_ROWS, MAX_ROWS);
  const safeQuery = safeReadOnlyQuery(query, effectiveLimit);

  const { rows, columns } = await executeAgentQuery(userId, safeQuery);

  let text = JSON.stringify(
    {
      columns,
      row_count: rows.length,
      rows,
      truncated: rows.length >= effectiveLimit,
    },
    null,
    2
  );

  if (text.length > CHARACTER_LIMIT) {
    const truncatedRows = [];
    let currentLength = 0;
    for (const row of rows) {
      const rowStr = JSON.stringify(row);
      if (currentLength + rowStr.length > CHARACTER_LIMIT - 500) {
        break;
      }
      truncatedRows.push(row);
      currentLength += rowStr.length;
    }
    text = JSON.stringify(
      {
        columns,
        note: `Response truncated to fit ${String(CHARACTER_LIMIT)} character limit. Use a more specific query or add LIMIT.`,
        row_count: truncatedRows.length,
        rows: truncatedRows,
        truncated: true,
      },
      null,
      2
    );
  }

  return {
    content: [{ text, type: "text" as const }],
  };
}
