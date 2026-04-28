import {
  locationJsonSchema,
  transactionNotesJsonSchema,
  userOverrideCategoryJsonSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

const transactionIdSchema = z.object({
  editId: z.uuid(),
  id: z.string(),
});

const updateLocationSchema = transactionIdSchema.extend({
  location: locationJsonSchema,
});

const updateNameSchema = transactionIdSchema.extend({
  name: z.string().min(1),
});

const updateDateSchema = transactionIdSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateCategorySchema = transactionIdSchema.extend({
  category: userOverrideCategoryJsonSchema,
});

const updateNotesSchema = transactionIdSchema.extend({
  notes: transactionNotesJsonSchema,
});

async function getOwned(tx: Transaction<Schema>, ctx: Context, id: string) {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const row = await tx.run(zql.transaction.where("id", id).one());
  if (!row || row.userId !== userId) {
    throw new Error("Transaction not found");
  }
  return { row, userId };
}

function addLocked(current: unknown, field: string): string[] {
  const arr = (current as string[] | null | undefined) ?? [];
  return arr.includes(field) ? arr : [...arr, field];
}

function removeLocked(current: unknown, field: string): string[] {
  return ((current as string[] | null | undefined) ?? []).filter(
    (f) => f !== field
  );
}

type EditField = "amount" | "category" | "date" | "location" | "name" | "notes";

async function appendEdit(
  tx: Transaction<Schema>,
  params: {
    editId: string;
    transactionId: string;
    userId: string;
    field: EditField;
    oldValue: unknown;
    newValue: unknown;
  }
) {
  await tx.mutate.transactionEdit.insert({
    actor: "user",
    createdAt: Date.now(),
    field: params.field,
    id: params.editId,
    newValue: params.newValue ?? null,
    oldValue: params.oldValue ?? null,
    transactionId: params.transactionId,
    userId: params.userId,
  });
}

export const transactionMutators = {
  resetCategory: defineMutator(
    transactionIdSchema,
    async ({ args, ctx, tx }) => {
      const { row, userId } = await getOwned(tx, ctx, args.id);
      await Promise.all([
        tx.mutate.transaction.update({
          id: args.id,
          lockedFields: removeLocked(row.lockedFields, "category"),
        }),
        appendEdit(tx, {
          editId: args.editId,
          field: "category",
          newValue: null,
          oldValue: row.category
            ? { detailed: row.categoryDetail, primary: row.category }
            : null,
          transactionId: args.id,
          userId,
        }),
      ]);
    }
  ),

  resetDate: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: removeLocked(row.lockedFields, "date"),
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "date",
        newValue: null,
        oldValue: row.date ?? null,
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

  resetLocation: defineMutator(
    transactionIdSchema,
    async ({ args, ctx, tx }) => {
      const { row, userId } = await getOwned(tx, ctx, args.id);
      await Promise.all([
        tx.mutate.transaction.update({
          id: args.id,
          userOverrideLocation: null,
        }),
        appendEdit(tx, {
          editId: args.editId,
          field: "location",
          newValue: null,
          oldValue: row.userOverrideLocation ?? null,
          transactionId: args.id,
          userId,
        }),
      ]);
    }
  ),

  resetName: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: removeLocked(row.lockedFields, "name"),
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "name",
        newValue: null,
        oldValue: row.name ?? null,
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

  resetNotes: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: removeLocked(row.lockedFields, "notes"),
        notes: null,
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "notes",
        newValue: null,
        oldValue: row.notes ?? null,
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

  updateCategory: defineMutator(
    updateCategorySchema,
    async ({ args, ctx, tx }) => {
      const { row, userId } = await getOwned(tx, ctx, args.id);
      await Promise.all([
        tx.mutate.transaction.update({
          category: args.category.primary,
          categoryConfidence: null,
          categoryDetail: args.category.detailed,
          id: args.id,
          lockedFields: addLocked(row.lockedFields, "category"),
        }),
        appendEdit(tx, {
          editId: args.editId,
          field: "category",
          newValue: args.category,
          oldValue: row.category
            ? { detailed: row.categoryDetail, primary: row.category }
            : null,
          transactionId: args.id,
          userId,
        }),
      ]);
    }
  ),

  updateDate: defineMutator(updateDateSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    const dateMs = new Date(`${args.date}T00:00:00.000Z`).getTime();
    await Promise.all([
      tx.mutate.transaction.update({
        date: dateMs,
        id: args.id,
        lockedFields: addLocked(row.lockedFields, "date"),
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "date",
        newValue: args.date,
        oldValue: row.date ?? null,
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

  updateLocation: defineMutator(
    updateLocationSchema,
    async ({ args, ctx, tx }) => {
      const { row, userId } = await getOwned(tx, ctx, args.id);
      await Promise.all([
        tx.mutate.transaction.update({
          id: args.id,
          userOverrideLocation: args.location,
        }),
        appendEdit(tx, {
          editId: args.editId,
          field: "location",
          newValue: args.location,
          oldValue: row.userOverrideLocation ?? null,
          transactionId: args.id,
          userId,
        }),
      ]);
    }
  ),

  updateName: defineMutator(updateNameSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: addLocked(row.lockedFields, "name"),
        name: args.name,
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "name",
        newValue: args.name,
        oldValue: row.name ?? null,
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

  updateNotes: defineMutator(updateNotesSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: addLocked(row.lockedFields, "notes"),
        notes: args.notes,
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "notes",
        newValue: args.notes,
        oldValue: row.notes ?? null,
        transactionId: args.id,
        userId,
      }),
    ]);
  }),
};
