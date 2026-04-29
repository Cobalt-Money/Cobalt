import {
  locationJsonSchema,
  transactionNotesMarkdownSchema,
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

/** Used by the manual create/delete flow — no edit-history coupling. */
const transactionIdOnlySchema = z.object({ id: z.string() });

const updateLocationSchema = transactionIdSchema.extend({
  location: locationJsonSchema,
});

const updateNameSchema = transactionIdSchema.extend({
  name: z.string().min(1),
});

const updateMerchantSchema = transactionIdSchema.extend({
  merchantName: z.string().max(255).nullable(),
  website: z.string().max(2048).nullable().optional(),
});

const updateDateSchema = transactionIdSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateCategorySchema = transactionIdSchema.extend({
  category: userOverrideCategoryJsonSchema,
});

const updateNotesSchema = transactionIdSchema.extend({
  notes: transactionNotesMarkdownSchema,
});

const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number(),
  category: userOverrideCategoryJsonSchema.optional(),
  currency: z.string().length(3).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Plain-text description; persisted as markdown on `notes`. */
  description: z.string().max(2000).optional(),
  location: locationJsonSchema.optional(),
  merchantName: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255),
  website: z.string().min(1).max(2048).optional(),
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

async function assertOwnsManualTransaction(
  tx: Transaction<Schema>,
  ctx: Context,
  transactionId: string
): Promise<void> {
  const { row } = await getOwned(tx, ctx, transactionId);
  if (row.source !== "manual") {
    throw new Error("Only manual transactions can be deleted");
  }
}

async function assertOwnsManualAccountForInsert(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string
): Promise<void> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const account = await tx.run(
    zql.financialAccount.where("id", accountId).one()
  );
  if (!account || account.userId !== userId) {
    throw new Error("Account not found");
  }
  if (account.source !== "manual") {
    throw new Error("Transactions can only be added to manual accounts");
  }
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

type EditField =
  | "amount"
  | "category"
  | "date"
  | "location"
  | "merchantName"
  | "name"
  | "notes";

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

function isoDateToEpochMs(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

export const transactionMutators = {
  createTransaction: defineMutator(
    createTransactionSchema,
    async ({ args, ctx, tx }) => {
      await assertOwnsManualAccountForInsert(tx, ctx, args.accountId);
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      const trimmedDesc = args.description?.trim();
      await tx.mutate.transaction.insert({
        accountId: args.accountId,
        amount: args.amount,
        category: args.category?.primary ?? null,
        categoryDetail: args.category?.detailed ?? null,
        currency: args.currency ?? "USD",
        date: isoDateToEpochMs(args.date),
        id: crypto.randomUUID(),
        merchantName: args.merchantName?.trim() ?? null,
        name: args.name.trim(),
        notes: trimmedDesc && trimmedDesc.length > 0 ? trimmedDesc : null,
        pending: false,
        source: "manual",
        userId: ctx.userId,
        userOverrideLocation: args.location ?? null,
        website: args.website?.trim() ?? null,
      });
    }
  ),

  deleteTransaction: defineMutator(
    transactionIdOnlySchema,
    async ({ args, ctx, tx }) => {
      await assertOwnsManualTransaction(tx, ctx, args.id);
      await tx.mutate.transaction.delete({ id: args.id });
    }
  ),

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

  updateMerchant: defineMutator(
    updateMerchantSchema,
    async ({ args, ctx, tx }) => {
      const { row, userId } = await getOwned(tx, ctx, args.id);
      const trimmedName = args.merchantName?.trim() ?? null;
      const nextName =
        trimmedName && trimmedName.length > 0 ? trimmedName : null;
      const trimmedSite = args.website?.trim() ?? null;
      const nextSite =
        trimmedSite && trimmedSite.length > 0 ? trimmedSite : null;
      await Promise.all([
        tx.mutate.transaction.update({
          id: args.id,
          lockedFields: addLocked(row.lockedFields, "merchantName"),
          merchantName: nextName,
          website: nextSite,
        }),
        appendEdit(tx, {
          editId: args.editId,
          field: "merchantName",
          newValue: nextName,
          oldValue: row.merchantName ?? null,
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
