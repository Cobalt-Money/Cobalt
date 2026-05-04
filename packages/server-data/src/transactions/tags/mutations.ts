import { db } from "@cobalt-web/db";
import { tag } from "@cobalt-web/db/schema/accounts/banking/tags/tag";
import { transactionTag } from "@cobalt-web/db/schema/accounts/banking/tags/transaction-tag";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { transactionEdit } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import { and, eq, inArray, sql } from "drizzle-orm";

import type {
  BulkApplyTagsBody,
  CreateTagBody,
  UpdateTagBody,
} from "./schemas.js";

export async function createTag(
  userId: string,
  body: CreateTagBody
): Promise<{ id: string }> {
  const [row] = await db
    .insert(tag)
    .values({
      color: body.color,
      name: body.name,
      userId,
    })
    .returning({ id: tag.id });

  if (!row) {
    throw new Error("Failed to create tag");
  }
  return { id: row.id };
}

export async function updateTag(
  userId: string,
  tagId: string,
  body: UpdateTagBody
): Promise<void> {
  const updates: Partial<typeof tag.$inferInsert> = {};
  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.color !== undefined) {
    updates.color = body.color;
  }
  if (body.archived !== undefined) {
    updates.archivedAt = body.archived ? new Date() : null;
  }
  if (Object.keys(updates).length === 0) {
    return;
  }

  await db
    .update(tag)
    .set(updates)
    .where(and(eq(tag.id, tagId), eq(tag.userId, userId)));
}

export async function deleteTag(userId: string, tagId: string): Promise<void> {
  await db.delete(tag).where(and(eq(tag.id, tagId), eq(tag.userId, userId)));
}

/**
 * Replace the full tag id-set on a single transaction.
 * Audits to transaction_edit with field='tags' (id arrays).
 */
export async function setTransactionTags(
  userId: string,
  transactionId: string,
  nextTagIds: string[]
): Promise<void> {
  await db.transaction(async (tx) => {
    // Verify ownership of the transaction.
    const [owner] = await tx
      .select({ userId: transaction.userId })
      .from(transaction)
      .where(eq(transaction.id, transactionId))
      .limit(1);
    if (!owner || owner.userId !== userId) {
      return;
    }

    const existing = await tx
      .select({ tagId: transactionTag.tagId })
      .from(transactionTag)
      .where(eq(transactionTag.transactionId, transactionId));
    const oldIds = existing.map((r) => r.tagId).toSorted();
    const newIds = [...new Set(nextTagIds)].toSorted();

    if (
      oldIds.length === newIds.length &&
      oldIds.every((v, i) => v === newIds[i])
    ) {
      return;
    }

    // Verify every nextTagId belongs to user (defends against cross-user grafting).
    if (newIds.length > 0) {
      const owned = await tx
        .select({ id: tag.id })
        .from(tag)
        .where(and(inArray(tag.id, newIds), eq(tag.userId, userId)));
      if (owned.length !== newIds.length) {
        throw new Error("One or more tags not owned by user");
      }
    }

    const toAdd = newIds.filter((id) => !oldIds.includes(id));
    const toRemove = oldIds.filter((id) => !newIds.includes(id));

    if (toRemove.length > 0) {
      await tx
        .delete(transactionTag)
        .where(
          and(
            eq(transactionTag.transactionId, transactionId),
            inArray(transactionTag.tagId, toRemove)
          )
        );
    }
    if (toAdd.length > 0) {
      await tx.insert(transactionTag).values(
        toAdd.map((tagId) => ({
          tagId,
          transactionId,
        }))
      );
    }

    await tx.insert(transactionEdit).values({
      actor: "user",
      field: "tags",
      newValue: newIds,
      oldValue: oldIds,
      transactionId,
      userId,
    });
  });
}

/**
 * Add and/or remove tags across many transactions in one transaction.
 * Each affected transaction gets one transaction_edit row capturing oldIds → newIds.
 */
export function bulkApplyTags(
  userId: string,
  body: BulkApplyTagsBody
): Promise<{ updatedCount: number }> {
  const { addTagIds, removeTagIds, transactionIds } = body;
  const addSet = [...new Set(addTagIds)];
  const removeSet = [...new Set(removeTagIds)];

  return db.transaction(async (tx) => {
    // Validate: tags belong to user.
    const allTagIds = [...new Set([...addSet, ...removeSet])];
    if (allTagIds.length > 0) {
      const owned = await tx
        .select({ id: tag.id })
        .from(tag)
        .where(and(inArray(tag.id, allTagIds), eq(tag.userId, userId)));
      if (owned.length !== allTagIds.length) {
        throw new Error("One or more tags not owned by user");
      }
    }

    // Validate: transactions belong to user.
    const ownedTxns = await tx
      .select({ id: transaction.id })
      .from(transaction)
      .where(
        and(
          inArray(transaction.id, transactionIds),
          eq(transaction.userId, userId)
        )
      );
    const ownedTxnIds = ownedTxns.map((t) => t.id);
    if (ownedTxnIds.length === 0) {
      return { updatedCount: 0 };
    }

    // Snapshot existing memberships for affected transactions.
    const existing = await tx
      .select({
        tagId: transactionTag.tagId,
        transactionId: transactionTag.transactionId,
      })
      .from(transactionTag)
      .where(inArray(transactionTag.transactionId, ownedTxnIds));

    const byTxn = new Map<string, Set<string>>();
    for (const txnId of ownedTxnIds) {
      byTxn.set(txnId, new Set());
    }
    for (const row of existing) {
      byTxn.get(row.transactionId)?.add(row.tagId);
    }

    let updatedCount = 0;
    const auditRows: (typeof transactionEdit.$inferInsert)[] = [];

    for (const txnId of ownedTxnIds) {
      const before = byTxn.get(txnId) ?? new Set<string>();
      const after = new Set(before);
      for (const id of removeSet) {
        after.delete(id);
      }
      for (const id of addSet) {
        after.add(id);
      }
      const oldIds = [...before].toSorted();
      const newIds = [...after].toSorted();
      if (
        oldIds.length === newIds.length &&
        oldIds.every((v, i) => v === newIds[i])
      ) {
        continue;
      }
      updatedCount += 1;
      auditRows.push({
        actor: "user",
        field: "tags",
        newValue: newIds,
        oldValue: oldIds,
        transactionId: txnId,
        userId,
      });
    }

    if (updatedCount === 0) {
      return { updatedCount: 0 };
    }

    if (removeSet.length > 0) {
      await tx
        .delete(transactionTag)
        .where(
          and(
            inArray(transactionTag.transactionId, ownedTxnIds),
            inArray(transactionTag.tagId, removeSet)
          )
        );
    }
    if (addSet.length > 0) {
      const inserts: (typeof transactionTag.$inferInsert)[] = [];
      for (const txnId of ownedTxnIds) {
        for (const tagId of addSet) {
          inserts.push({ tagId, transactionId: txnId });
        }
      }
      // ON CONFLICT DO NOTHING to skip already-attached pairs.
      await tx
        .insert(transactionTag)
        .values(inserts)
        .onConflictDoNothing({
          target: [transactionTag.transactionId, transactionTag.tagId],
        });
    }

    await tx.insert(transactionEdit).values(auditRows);

    // Touch updatedAt on affected transactions.
    await tx
      .update(transaction)
      .set({ updatedAt: sql`now()` })
      .where(inArray(transaction.id, ownedTxnIds));

    return { updatedCount };
  });
}
