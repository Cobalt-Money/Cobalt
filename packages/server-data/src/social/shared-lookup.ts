import { db } from "@cobalt-web/db";
import { socialPost } from "@cobalt-web/db/schema/social/post";
import { and, eq, inArray } from "drizzle-orm";

/** Single-row check — for transaction detail endpoint. */
export async function isTransactionShared(userId: string, transactionId: string): Promise<boolean> {
  const row = await db
    .select({ id: socialPost.id })
    .from(socialPost)
    .where(and(eq(socialPost.userId, userId), eq(socialPost.transactionId, transactionId)))
    .limit(1);
  return row.length > 0;
}

/** Bulk check — for transaction list endpoint. Returns shared transaction id Set. */
export async function getSharedTransactionIds(
  userId: string,
  transactionIds: string[],
): Promise<Set<string>> {
  if (transactionIds.length === 0) {
    return new Set();
  }
  const rows = await db
    .select({ transactionId: socialPost.transactionId })
    .from(socialPost)
    .where(and(eq(socialPost.userId, userId), inArray(socialPost.transactionId, transactionIds)));
  return new Set(rows.map((r) => r.transactionId));
}
