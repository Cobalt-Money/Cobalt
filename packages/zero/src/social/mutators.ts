import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";

import { requireOwned } from "../auth.js";
import { zql } from "../schema.js";

const amountModeSchema = z.enum(["exact", "bucket", "hide"]);

const createPostSchema = z.object({
  /** Set when amountMode = 'bucket'. */
  amountBucket: z.enum(["$", "$$", "$$$"]).optional(),
  amountMode: amountModeSchema.default("exact"),
  /** Caller-supplied id so optimistic client insert and server insert agree. */
  id: z.uuid(),
  note: z.string().trim().max(280).optional(),
  transactionId: z.uuid(),
});

const updatePostSchema = z.object({
  amountBucket: z.enum(["$", "$$", "$$$"]).optional().nullable(),
  amountMode: amountModeSchema.optional(),
  note: z.string().trim().max(280).optional().nullable(),
  postId: z.uuid(),
});

const deletePostSchema = z.object({ postId: z.uuid() });

const removeFriendshipSchema = z.object({ friendshipId: z.uuid() });

const setVisibilityRuleSchema = z.object({
  /** Caller-supplied id for optimistic insert. Reused on conflict via upsert. */
  autoShare: z.boolean(),
  categoryId: z.uuid(),
  id: z.uuid(),
});

const createPrivacyZoneSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().max(50).optional(),
  lat: z.number(),
  lon: z.number(),
  radiusM: z.number().int().min(50).max(5000).default(200),
});

const deletePrivacyZoneSchema = z.object({ zoneId: z.uuid() });

/**
 * Social mutators (`mutators.social.*`). Ownership enforced server-side via
 * `requireOwned` or inline checks against `ctx.userId`.
 */
export const socialMutators = {
  friendships: {
    remove: defineMutator(removeFriendshipSchema, async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      const row = await tx.run(zql.socialFriendship.where("id", args.friendshipId).one());
      if (!row) {
        throw new Error("Friendship not found");
      }
      if (row.userAId !== ctx.userId && row.userBId !== ctx.userId) {
        throw new Error("Not a member of this friendship");
      }
      await tx.mutate.socialFriendship.delete({ id: args.friendshipId });
    }),
  },

  posts: {
    create: defineMutator(createPostSchema, async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      const txn = await tx.run(zql.transaction.where("id", args.transactionId).one());
      if (!txn || txn.userId !== ctx.userId) {
        throw new Error("Transaction not found or not owned by caller");
      }

      const amountCents =
        args.amountMode === "exact" && typeof txn.amount === "number"
          ? Math.round(Math.abs(txn.amount) * 100)
          : null;
      const amountBucket = args.amountMode === "bucket" ? (args.amountBucket ?? null) : null;

      const merchantName = txn.merchantName ?? txn.name ?? "Unknown";
      const lat = typeof txn.lat === "number" ? txn.lat : null;
      const lon = typeof txn.lon === "number" ? txn.lon : null;
      const date = typeof txn.date === "number" ? txn.date : Date.now();

      await tx.mutate.socialPost.insert({
        amountBucket,
        amountCents,
        createdAt: Date.now(),
        date,
        id: args.id,
        lat,
        lon,
        merchantName,
        note: args.note ?? null,
        transactionId: args.transactionId,
        userId: ctx.userId,
      });
    }),

    delete: defineMutator(deletePostSchema, async ({ args, ctx, tx }) => {
      await requireOwned(ctx, () => tx.run(zql.socialPost.where("id", args.postId).one()));
      await tx.mutate.socialPost.delete({ id: args.postId });
    }),

    update: defineMutator(updatePostSchema, async ({ args, ctx, tx }) => {
      const { row } = await requireOwned(ctx, () =>
        tx.run(zql.socialPost.where("id", args.postId).one()),
      );
      const patch: Record<string, unknown> = {};
      if (args.amountMode === "exact") {
        patch.amountBucket = null;
      } else if (args.amountMode === "bucket") {
        patch.amountCents = null;
        patch.amountBucket = args.amountBucket ?? row.amountBucket;
      } else if (args.amountMode === "hide") {
        patch.amountCents = null;
        patch.amountBucket = null;
      }
      if (args.note !== undefined) {
        patch.note = args.note;
      }
      await tx.mutate.socialPost.update({ id: args.postId, ...patch });
    }),
  },

  privacyZones: {
    create: defineMutator(createPrivacyZoneSchema, async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      await tx.mutate.socialPrivacyZone.insert({
        createdAt: Date.now(),
        id: args.id,
        label: args.label ?? null,
        lat: args.lat,
        lon: args.lon,
        radiusM: args.radiusM,
        userId: ctx.userId,
      });
    }),

    delete: defineMutator(deletePrivacyZoneSchema, async ({ args, ctx, tx }) => {
      await requireOwned(ctx, () => tx.run(zql.socialPrivacyZone.where("id", args.zoneId).one()));
      await tx.mutate.socialPrivacyZone.delete({ id: args.zoneId });
    }),
  },

  visibilityRules: {
    set: defineMutator(setVisibilityRuleSchema, async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      const existing = await tx.run(
        zql.socialVisibilityRule
          .where("userId", ctx.userId)
          .where("categoryId", args.categoryId)
          .one(),
      );
      const now = Date.now();
      await (existing
        ? tx.mutate.socialVisibilityRule.update({
            autoShare: args.autoShare,
            id: existing.id,
            updatedAt: now,
          })
        : tx.mutate.socialVisibilityRule.insert({
            autoShare: args.autoShare,
            categoryId: args.categoryId,
            createdAt: now,
            id: args.id,
            updatedAt: now,
            userId: ctx.userId,
          }));
    }),
  },
};
