import { TAG_COLORS } from "@cobalt-web/db/tag-palette";
import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";

import { zql } from "../schema.js";

const tagColorSchema = z.enum(TAG_COLORS);

const createTagSchema = z.object({
  /** Caller-supplied id so client-optimistic insert and server insert agree. */
  color: tagColorSchema,
  id: z.uuid(),
  name: z.string().trim().min(1).max(50),
});

const updateTagSchema = z.object({
  archived: z.boolean().optional(),
  color: tagColorSchema.optional(),
  name: z.string().trim().min(1).max(50).optional(),
  tagId: z.uuid(),
});

const deleteTagSchema = z.object({
  tagId: z.uuid(),
});

const setTransactionTagsSchema = z.object({
  /** Caller-supplied audit row id so client+server inserts agree. */
  editId: z.uuid(),
  tagIds: z.array(z.uuid()),
  transactionId: z.uuid(),
});

const bulkApplyTagsSchema = z.object({
  addTagIds: z.array(z.uuid()).default([]),
  /** Audit row id per affected transaction, in `transactionIds` order. */
  editIds: z.array(z.uuid()),
  removeTagIds: z.array(z.uuid()).default([]),
  transactionIds: z.array(z.uuid()).min(1),
});

/** Tag mutators (`mutators.tags.*`). Ownership encoded in ZQL filter. */
export const tagsMutators = {
  bulkApply: defineMutator(bulkApplyTagsSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const txnIds = [...new Set(args.transactionIds)];
    if (args.editIds.length !== txnIds.length) {
      throw new Error("editIds length must match transactionIds length");
    }
    const allTagIds = [...new Set([...args.addTagIds, ...args.removeTagIds])];
    if (allTagIds.length > 0) {
      const ownedTags = await tx.run(
        zql.tag
          .where("userId", ctx.userId)
          .where(({ cmp, or }) =>
            or(...allTagIds.map((id) => cmp("id", "=", id)))
          )
      );
      if (ownedTags.length !== allTagIds.length) {
        throw new Error("One or more tags not owned by user");
      }
    }

    for (const [i, txnId] of txnIds.entries()) {
      const editId = args.editIds[i];
      if (!editId) {
        continue;
      }
      const txn = await tx.run(zql.transaction.where("id", txnId).one());
      if (!txn || txn.userId !== ctx.userId) {
        continue;
      }
      const existing = await tx.run(
        zql.transactionTag.where("transactionId", txnId)
      );
      const before = new Set(existing.map((r) => r.tagId as string));
      const after = new Set(before);
      for (const id of args.removeTagIds) {
        after.delete(id);
      }
      for (const id of args.addTagIds) {
        after.add(id);
      }
      const oldIds = [...before].toSorted();
      const newIds = [...after].toSorted();
      const same =
        oldIds.length === newIds.length &&
        oldIds.every((v, j) => v === newIds[j]);
      if (same) {
        continue;
      }

      const toAdd = newIds.filter((id) => !oldIds.includes(id));
      const toRemove = oldIds.filter((id) => !newIds.includes(id));

      for (const tagId of toRemove) {
        await tx.mutate.transactionTag.delete({
          tagId,
          transactionId: txnId,
        });
      }
      for (const tagId of toAdd) {
        await tx.mutate.transactionTag.insert({
          createdAt: Date.now(),
          tagId,
          transactionId: txnId,
        });
      }

      await tx.mutate.transactionEdit.insert({
        actor: "user",
        createdAt: Date.now(),
        field: "tags",
        id: editId,
        newValue: newIds,
        oldValue: oldIds,
        transactionId: txnId,
        userId: ctx.userId,
      });
    }
  }),

  create: defineMutator(createTagSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const now = Date.now();
    await tx.mutate.tag.insert({
      archivedAt: null,
      color: args.color,
      createdAt: now,
      id: args.id,
      name: args.name,
      updatedAt: now,
      userId: ctx.userId,
    });
  }),

  delete: defineMutator(deleteTagSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const owned = await tx.run(
      zql.tag.where("id", args.tagId).where("userId", ctx.userId).one()
    );
    if (!owned) {
      return;
    }
    // transaction_tag rows cascade via Postgres FK on tag delete.
    await tx.mutate.tag.delete({ id: args.tagId });
  }),

  setTransactionTags: defineMutator(
    setTransactionTagsSchema,
    async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Not authenticated");
      }
      const txn = await tx.run(
        zql.transaction.where("id", args.transactionId).one()
      );
      if (!txn || txn.userId !== ctx.userId) {
        return;
      }

      const nextIds = [...new Set(args.tagIds)].toSorted();
      if (nextIds.length > 0) {
        const ownedTags = await tx.run(
          zql.tag
            .where("userId", ctx.userId)
            .where(({ cmp, or }) =>
              or(...nextIds.map((id) => cmp("id", "=", id)))
            )
        );
        if (ownedTags.length !== nextIds.length) {
          throw new Error("One or more tags not owned by user");
        }
      }

      const existing = await tx.run(
        zql.transactionTag.where("transactionId", args.transactionId)
      );
      const oldIds = existing.map((r) => r.tagId as string).toSorted();

      const same =
        oldIds.length === nextIds.length &&
        oldIds.every((v, i) => v === nextIds[i]);
      if (same) {
        return;
      }

      const toAdd = nextIds.filter((id) => !oldIds.includes(id));
      const toRemove = oldIds.filter((id) => !nextIds.includes(id));

      for (const tagId of toRemove) {
        await tx.mutate.transactionTag.delete({
          tagId,
          transactionId: args.transactionId,
        });
      }
      for (const tagId of toAdd) {
        await tx.mutate.transactionTag.insert({
          createdAt: Date.now(),
          tagId,
          transactionId: args.transactionId,
        });
      }

      await tx.mutate.transactionEdit.insert({
        actor: "user",
        createdAt: Date.now(),
        field: "tags",
        id: args.editId,
        newValue: nextIds,
        oldValue: oldIds,
        transactionId: args.transactionId,
        userId: ctx.userId,
      });
    }
  ),

  update: defineMutator(updateTagSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const owned = await tx.run(
      zql.tag.where("id", args.tagId).where("userId", ctx.userId).one()
    );
    if (!owned) {
      return;
    }
    const patch: {
      id: string;
      name?: string;
      color?: string;
      archivedAt?: number | null;
      updatedAt: number;
    } = { id: args.tagId, updatedAt: Date.now() };
    if (args.name !== undefined) {
      patch.name = args.name;
    }
    if (args.color !== undefined) {
      patch.color = args.color;
    }
    if (args.archived !== undefined) {
      patch.archivedAt = args.archived ? Date.now() : null;
    }
    await tx.mutate.tag.update(patch);
  }),
};
