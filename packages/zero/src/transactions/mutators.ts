import {
  locationJsonSchema,
  userOverrideCategoryJsonSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { defineMutator } from "@rocicorp/zero";
import type { ReadonlyJSONObject, Transaction } from "@rocicorp/zero";
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

const NOTES_MAX_SERIALIZED_BYTES = 100_000;

// Typed as `ReadonlyJSONObject` so the inferred arg is assignable to Zero's
// `notes` column (json). Shape validation runs via `transactionNotesBodySchema`
// on the REST path; here we just assert it's an object and bound payload size.
const tiptapDocSchema = z
  .custom<ReadonlyJSONObject>(
    (val) => typeof val === "object" && val !== null && !Array.isArray(val),
    { message: "Expected a Tiptap document object" }
  )
  .refine((doc) => JSON.stringify(doc).length <= NOTES_MAX_SERIALIZED_BYTES, {
    message: `Note exceeds ${NOTES_MAX_SERIALIZED_BYTES} serialized bytes`,
  });

const updateNotesSchema = transactionIdSchema.extend({
  notes: tiptapDocSchema,
});

const updateLocationSchema = transactionIdSchema.extend({
  location: locationJsonSchema,
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
  const row = await tx.run(zql.transaction.where("id", transactionId).one());
  const ownerId = row?.userId;
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
  resetLocation: defineMutator(
    transactionIdSchema,
    async ({ args, ctx, tx }) => {
      await assertOwnsTransaction(tx, ctx, args.id);
      await tx.mutate.transaction.update({
        id: args.id,
        userOverrideLocation: null,
      });
    }
  ),
  resetName: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      userOverrideName: null,
    });
  }),
  resetNotes: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      notes: null,
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
  updateLocation: defineMutator(
    updateLocationSchema,
    async ({ args, ctx, tx }) => {
      await assertOwnsTransaction(tx, ctx, args.id);
      await tx.mutate.transaction.update({
        id: args.id,
        userOverrideLocation: args.location,
      });
    }
  ),
  updateName: defineMutator(updateNameSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      userOverrideName: args.name.trim(),
    });
  }),
  updateNotes: defineMutator(updateNotesSchema, async ({ args, ctx, tx }) => {
    await assertOwnsTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.update({
      id: args.id,
      notes: args.notes,
    });
  }),
};
