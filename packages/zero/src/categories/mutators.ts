import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";

import { zql } from "../schema.js";

const UNCATEGORIZED_KEY = "uncategorized";

const nameSchema = z.string().trim().min(1).max(50);
const iconKeySchema = z.string().trim().min(1).max(50);

const createCategorySchema = z.object({
  /** Caller-supplied id so client-optimistic insert and server insert agree. */
  excludeFromInsights: z.boolean().optional(),
  groupId: z.uuid(),
  iconKey: iconKeySchema,
  id: z.uuid(),
  name: nameSchema,
});

const updateCategorySchema = z.object({
  categoryId: z.uuid(),
  excludeFromInsights: z.boolean().optional(),
  groupId: z.uuid().optional(),
  hidden: z.boolean().optional(),
  iconKey: iconKeySchema.optional(),
  name: nameSchema.optional(),
  order: z.number().int().nonnegative().optional(),
});

const deleteCategorySchema = z.object({
  categoryId: z.uuid(),
});

const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.uuid()).min(1),
  groupId: z.uuid(),
});

const createGroupSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
});

const updateGroupSchema = z.object({
  groupId: z.uuid(),
  name: nameSchema.optional(),
  order: z.number().int().nonnegative().optional(),
});

const deleteGroupSchema = z.object({
  groupId: z.uuid(),
});

const reorderGroupsSchema = z.object({
  groupIds: z.array(z.uuid()).min(1),
});

/** Category mutators (`mutators.categories.*`). Ownership encoded in ZQL filter. */
export const categoriesMutators = {
  create: defineMutator(createCategorySchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }

    const group = await tx.run(
      zql.categoryGroup
        .where("id", args.groupId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!group) {
      throw new Error("Group not found");
    }

    const siblings = await tx.run(
      zql.category
        .where("userId", ctx.userId)
        .where("groupId", args.groupId)
        .where("deletedAt", "IS", null),
    );
    let maxOrder = -1;
    for (const r of siblings) {
      const o = (r.order as number) ?? 0;
      if (o > maxOrder) {
        maxOrder = o;
      }
    }
    const nextOrder = maxOrder + 1;

    const now = Date.now();
    await tx.mutate.category.insert({
      createdAt: now,
      deletedAt: null,
      excludeFromInsights: args.excludeFromInsights ?? false,
      groupId: args.groupId,
      hidden: false,
      iconKey: args.iconKey,
      id: args.id,
      name: args.name,
      order: nextOrder,
      systemKey: null,
      updatedAt: now,
      userId: ctx.userId,
    });
  }),

  createGroup: defineMutator(createGroupSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const siblings = await tx.run(
      zql.categoryGroup.where("userId", ctx.userId).where("deletedAt", "IS", null),
    );
    let maxOrder = -1;
    for (const r of siblings) {
      const o = (r.order as number) ?? 0;
      if (o > maxOrder) {
        maxOrder = o;
      }
    }
    const nextOrder = maxOrder + 1;

    const now = Date.now();
    await tx.mutate.categoryGroup.insert({
      createdAt: now,
      deletedAt: null,
      id: args.id,
      name: args.name,
      order: nextOrder,
      systemKey: null,
      updatedAt: now,
      userId: ctx.userId,
    });
  }),

  /**
   * Soft-delete a custom category. FK is `restrict`, so reassign all dependent
   * transactions + recurring rows to the user's `uncategorized` seed cat first,
   * then mark `deletedAt`. System cats reject (only hidden via `update`).
   */
  delete: defineMutator(deleteCategorySchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }

    const owned = await tx.run(
      zql.category
        .where("id", args.categoryId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!owned) {
      return;
    }
    if (owned.systemKey !== null) {
      throw new Error("System categories cannot be deleted");
    }

    const uncategorized = await tx.run(
      zql.category
        .where("userId", ctx.userId)
        .where("systemKey", UNCATEGORIZED_KEY)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!uncategorized) {
      throw new Error("Uncategorized seed missing");
    }
    if (uncategorized.id === args.categoryId) {
      throw new Error("Cannot delete uncategorized");
    }

    const txns = await tx.run(
      zql.transaction.where("userId", ctx.userId).where("categoryId", args.categoryId),
    );
    for (const t of txns) {
      await tx.mutate.transaction.update({
        categoryId: uncategorized.id as string,
        id: t.id as string,
      });
    }

    const recs = await tx.run(
      zql.recurring.where("userId", ctx.userId).where("categoryId", args.categoryId),
    );
    for (const r of recs) {
      await tx.mutate.recurring.update({
        categoryId: uncategorized.id as string,
        id: r.id as string,
      });
    }

    await tx.mutate.category.update({
      deletedAt: Date.now(),
      id: args.categoryId,
      updatedAt: Date.now(),
    });
  }),

  /**
   * Soft-delete a custom group. FK on `category.groupId` is `restrict`, so
   * the group must have zero non-deleted children before deletion.
   */
  deleteGroup: defineMutator(deleteGroupSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const owned = await tx.run(
      zql.categoryGroup
        .where("id", args.groupId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!owned) {
      return;
    }
    if (owned.systemKey !== null) {
      throw new Error("System groups cannot be deleted");
    }

    const children = await tx.run(
      zql.category
        .where("userId", ctx.userId)
        .where("groupId", args.groupId)
        .where("deletedAt", "IS", null),
    );
    if (children.length > 0) {
      throw new Error("Move or delete categories before deleting the group");
    }

    await tx.mutate.categoryGroup.update({
      deletedAt: Date.now(),
      id: args.groupId,
      updatedAt: Date.now(),
    });
  }),

  reorder: defineMutator(reorderCategoriesSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const group = await tx.run(
      zql.categoryGroup
        .where("id", args.groupId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!group) {
      throw new Error("Group not found");
    }
    /*
     * Reorder is order-only. Filter to cats currently in this group + owned by
     * user — never reassign groupId here (cross-group moves go through `update`).
     * Without this filter a stale client list would yank cats back into this
     * group via the order-write path.
     */
    const owned = await tx.run(
      zql.category
        .where("userId", ctx.userId)
        .where("groupId", args.groupId)
        .where("deletedAt", "IS", null),
    );
    const ownedIds = new Set(owned.map((r) => r.id as string));
    const ids = [...new Set(args.categoryIds)].filter((id) => ownedIds.has(id));
    for (const [i, id] of ids.entries()) {
      await tx.mutate.category.update({
        id,
        order: i,
        updatedAt: Date.now(),
      });
    }
  }),

  reorderGroups: defineMutator(reorderGroupsSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const ids = [...new Set(args.groupIds)];
    for (const [i, id] of ids.entries()) {
      await tx.mutate.categoryGroup.update({
        id,
        order: i,
        updatedAt: Date.now(),
      });
    }
  }),

  update: defineMutator(updateCategorySchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const owned = await tx.run(
      zql.category
        .where("id", args.categoryId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!owned) {
      return;
    }

    if (args.groupId !== undefined) {
      const group = await tx.run(
        zql.categoryGroup
          .where("id", args.groupId)
          .where("userId", ctx.userId)
          .where("deletedAt", "IS", null)
          .one(),
      );
      if (!group) {
        throw new Error("Group not found");
      }
    }

    const patch: {
      id: string;
      name?: string;
      iconKey?: string;
      groupId?: string;
      hidden?: boolean;
      order?: number;
      excludeFromInsights?: boolean;
      updatedAt: number;
    } = { id: args.categoryId, updatedAt: Date.now() };
    if (args.name !== undefined) {
      patch.name = args.name;
    }
    if (args.iconKey !== undefined) {
      patch.iconKey = args.iconKey;
    }
    if (args.groupId !== undefined) {
      patch.groupId = args.groupId;
    }
    if (args.hidden !== undefined) {
      patch.hidden = args.hidden;
    }
    if (args.order !== undefined) {
      patch.order = args.order;
    }
    if (args.excludeFromInsights !== undefined) {
      patch.excludeFromInsights = args.excludeFromInsights;
    }

    await tx.mutate.category.update(patch);
  }),

  updateGroup: defineMutator(updateGroupSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const owned = await tx.run(
      zql.categoryGroup
        .where("id", args.groupId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!owned) {
      return;
    }
    const patch: {
      id: string;
      name?: string;
      order?: number;
      updatedAt: number;
    } = { id: args.groupId, updatedAt: Date.now() };
    if (args.name !== undefined) {
      patch.name = args.name;
    }
    if (args.order !== undefined) {
      patch.order = args.order;
    }
    await tx.mutate.categoryGroup.update(patch);
  }),
};
