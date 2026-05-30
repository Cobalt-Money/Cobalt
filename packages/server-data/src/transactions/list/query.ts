import { db } from "@cobalt-web/db";
import { transactionTag } from "@cobalt-web/db/schema/accounts/banking/tags/transaction-tag";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, desc, eq, exists, gte, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";
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

function tagIdExistsClause(tagIds: string[]): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(transactionTag)
      .where(
        and(
          eq(transactionTag.transactionId, transaction.id),
          inArray(transactionTag.tagId, tagIds),
        ),
      ),
  );
}

function searchClause(searchPattern: string): SQL | undefined {
  return or(
    ilike(transaction.name, searchPattern),
    ilike(transaction.merchantName, searchPattern),
    sql`${transaction.notes}::text ILIKE ${searchPattern}`,
  );
}

function cursorClause(p: CursorPayload): SQL {
  return or(
    lt(transaction.date, p.d),
    and(eq(transaction.date, p.d), lt(transaction.id, p.i)),
  ) as SQL;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: filter builder — ternaries are the idiomatic Drizzle pattern
// eslint-disable-next-line complexity
export async function getTransactions(userId: string, params: GetTransactionsParams) {
  const { limit = 50 } = params;
  const cursorPayload = decodeCursor(params.cursor);
  const search = params.searchQuery?.trim();
  const searchPattern = search ? `%${search}%` : undefined;

  const rows = await selectTransactionRows()
    .where(
      and(
        eq(transaction.userId, userId),
        params.accountType ? eq(financialAccount.type, params.accountType) : undefined,
        params.pendingFilter === undefined
          ? undefined
          : eq(transaction.pending, params.pendingFilter === "true"),
        params.startDate ? gte(transaction.date, params.startDate) : undefined,
        params.endDate ? lte(transaction.date, params.endDate) : undefined,
        params.minAmount === undefined
          ? undefined
          : gte(transaction.amount, String(params.minAmount)),
        params.maxAmount === undefined
          ? undefined
          : lte(transaction.amount, String(params.maxAmount)),
        params.categoryGroup?.length
          ? inArray(categoryGroup.systemKey, params.categoryGroup)
          : undefined,
        params.categoryId?.length ? inArray(transaction.categoryId, params.categoryId) : undefined,
        params.accountId?.length ? inArray(transaction.accountId, params.accountId) : undefined,
        params.accountSubtype?.length
          ? inArray(financialAccount.subtype, params.accountSubtype)
          : undefined,
        params.tagId?.length ? tagIdExistsClause(params.tagId) : undefined,
        searchPattern ? searchClause(searchPattern) : undefined,
        cursorPayload ? cursorClause(cursorPayload) : undefined,
      ),
    )
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
