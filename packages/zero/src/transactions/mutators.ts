import { userOverrideCategoryJsonSchema } from "@cobalt-web/db/schema/banking";
import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

const transactionIdSchema = z.object({ id: z.string() });

const updateNameSchema = transactionIdSchema.extend({
  name: z.string().min(1).max(255),
});

const updateDateSchema = transactionIdSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateCategorySchema = transactionIdSchema.extend({
  category: userOverrideCategoryJsonSchema,
});

async function assertOwnsTransaction(
  tx: Transaction<Schema>,
  ctx: Context,
  transactionId: string
): Promise<void> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const row = await tx.run(
    zql.transaction
      .where("id", transactionId)
      .related("account", (acc) => acc.related("connection"))
      .one()
  );
  const ownerId = row?.account?.connection?.userId;
  if (!ownerId || ownerId !== userId) {
    throw new Error("Transaction not found");
  }
}

function isoDateToEpochMs(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

export const transactionMutators = {
  resetCategory: defineMutator(
    transactionIdSchema,
    async ({ args, ctx, tx }) => {
      await assertOwnsTransaction(tx, ctx, args.id);
      await tx.mutate.transaction.update({
        id: args.id,
        userOverrideCategory: null,
      });
    }
  ),
  resetDate: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      userOverrideDate: null,
    });
  }),
  resetName: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      userOverrideName: null,
    });
  }),
  updateCategory: defineMutator(
    updateCategorySchema,
    async ({ args, ctx, tx }) => {
      await assertOwnsTransaction(tx, ctx, args.id);
      await tx.mutate.transaction.update({
        id: args.id,
        userOverrideCategory: args.category,
      });
    }
  ),
  updateDate: defineMutator(updateDateSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      userOverrideDate: isoDateToEpochMs(args.date),
    });
  }),
  updateName: defineMutator(updateNameSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      userOverrideName: args.name.trim(),
    });
  }),
};
