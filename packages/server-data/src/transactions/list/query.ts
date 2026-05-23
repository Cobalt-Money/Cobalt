import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, desc, eq, gte, ilike, lt, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { z } from "zod";

import {
  fetchTagsByTransaction,
  selectTransactionRows,
  toTransactionDto,
} from "../detail/query.js";
import type { getTransactionsSchema } from "./schema.js";

export type GetTransactionsParams = z.infer<typeof getTransactionsSchema>;

interface CursorPayload {
  d: string;
  i: string;
}

function decodeCursor(cursor: string | undefined): CursorPayload | null {
  if (!cursor) {
    return null;
  }
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (typeof parsed.d !== "string" || typeof parsed.i !== "string") {
      return null;
    }
    return { d: parsed.d, i: parsed.i };
  } catch {
    return null;
  }
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export async function getTransactions(userId: string, params: GetTransactionsParams) {
  const {
    limit = 50,
    cursor,
    accountType,
    pendingFilter,
    startDate,
    endDate,
    searchQuery,
    minAmount,
    maxAmount,
    primaryCategory,
  } = params;
  const cursorPayload = decodeCursor(cursor);

  const search = searchQuery?.trim();
  const searchPattern = search ? `%${search}%` : undefined;

  const conditions: SQL[] = [eq(transaction.userId, userId)];
  if (accountType) {
    conditions.push(eq(financialAccount.type, accountType));
  }
  if (pendingFilter !== undefined) {
    conditions.push(eq(transaction.pending, pendingFilter === "true"));
  }
  if (startDate) {
    conditions.push(gte(transaction.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(transaction.date, endDate));
  }
  if (minAmount !== undefined) {
    conditions.push(gte(transaction.amount, String(minAmount)));
  }
  if (maxAmount !== undefined) {
    conditions.push(lte(transaction.amount, String(maxAmount)));
  }
  if (primaryCategory) {
    conditions.push(eq(categoryGroup.systemKey, primaryCategory));
  }
  if (searchPattern) {
    const orClause = or(
      ilike(transaction.name, searchPattern),
      ilike(transaction.merchantName, searchPattern),
      sql`${transaction.notes}::text ILIKE ${searchPattern}`,
    );
    if (orClause) {
      conditions.push(orClause);
    }
  }
  if (cursorPayload) {
    conditions.push(
      or(
        lt(transaction.date, cursorPayload.d),
        and(eq(transaction.date, cursorPayload.d), lt(transaction.id, cursorPayload.i)),
      ) as SQL,
    );
  }

  const rows = await selectTransactionRows()
    .where(and(...conditions))
    .orderBy(desc(transaction.date), desc(transaction.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  if (hasMore) {
    rows.pop();
  }
  const lastRow = rows.at(-1);
  const nextCursor =
    hasMore && lastRow ? encodeCursor({ d: String(lastRow.date), i: lastRow.id }) : null;

  const tagsByTx = await fetchTagsByTransaction(rows.map((r) => r.id));
  const transactions = rows.map((row) => toTransactionDto(row, tagsByTx.get(row.id) ?? []));
  return { hasMore, nextCursor, transactions };
}
