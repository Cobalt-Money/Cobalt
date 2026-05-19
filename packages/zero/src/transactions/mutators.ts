import type { LocationJson } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import {
  locationJsonSchema,
  transactionNotesMarkdownSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { defineMutator } from "@rocicorp/zero";
import type { ReadonlyJSONValue, Transaction } from "@rocicorp/zero";
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
  categoryId: z.uuid(),
});

const updateNotesSchema = transactionIdSchema.extend({
  notes: transactionNotesMarkdownSchema,
});

const bulkSetCategorySchema = z.object({
  categoryId: z.uuid(),
  /** Audit row id per affected transaction, in `transactionIds` order. */
  editIds: z.array(z.uuid()),
  transactionIds: z.array(z.uuid()).min(1),
});

const bulkSetExcludedSchema = z.object({
  excluded: z.boolean(),
  transactionIds: z.array(z.uuid()).min(1),
});

const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number(),
  categoryId: z.uuid().nullable().optional(),
  currency: z.string().length(3).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Plain-text description; persisted as markdown on `notes`. */
  description: z.string().max(2000).optional(),
  /** Caller-supplied id; client generates so it can attach tags via REST after Zero commits. */
  id: z.uuid().optional(),
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
  transactionId: string,
): Promise<void> {
  const { row } = await getOwned(tx, ctx, transactionId);
  if (row.source !== "manual") {
    throw new Error("Only manual transactions can be deleted");
  }
}

async function assertOwnsManualAccountForInsert(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string,
): Promise<void> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const account = await tx.run(zql.financialAccount.where("id", accountId).one());
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
  return ((current as string[] | null | undefined) ?? []).filter((f) => f !== field);
}

type EditField = "amount" | "category" | "date" | "location" | "merchantName" | "name" | "notes";

async function appendEdit(
  tx: Transaction<Schema>,
  params: {
    editId: string;
    transactionId: string;
    userId: string;
    field: EditField;
    oldValue: unknown;
    newValue: unknown;
  },
) {
  await tx.mutate.transactionEdit.insert({
    actor: "user",
    createdAt: Date.now(),
    field: params.field,
    id: params.editId,
    newValue: (params.newValue ?? null) as ReadonlyJSONValue,
    oldValue: (params.oldValue ?? null) as ReadonlyJSONValue,
    transactionId: params.transactionId,
    userId: params.userId,
  });
}

function isoDateToEpochMs(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

const LOCATION_FLAT_NULL = {
  address: null,
  city: null,
  country: null,
  lat: null,
  lon: null,
  postalCode: null,
  region: null,
  storeNumber: null,
} as const;

function locationToFlat(loc: LocationJson) {
  return {
    address: loc.address,
    city: loc.city,
    country: loc.country,
    lat: loc.lat,
    lon: loc.lon,
    postalCode: loc.postal_code,
    region: loc.region,
    storeNumber: loc.store_number,
  };
}

function flatToLocation(row: Record<string, unknown>): LocationJson {
  return {
    address: (row.address as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,
    lat: (row.lat as number | null | undefined) ?? null,
    lon: (row.lon as number | null | undefined) ?? null,
    postal_code: (row.postalCode as string | null | undefined) ?? null,
    region: (row.region as string | null | undefined) ?? null,
    store_number: (row.storeNumber as string | null | undefined) ?? null,
  };
}

export const transactionMutators = {
  bulkSetCategory: defineMutator(bulkSetCategorySchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const txnIds = [...new Set(args.transactionIds)];
    if (args.editIds.length !== txnIds.length) {
      throw new Error("editIds length must match transactionIds length");
    }
    const targetCat = await tx.run(
      zql.category
        .where("id", args.categoryId)
        .where("userId", ctx.userId)
        .where("deletedAt", "IS", null)
        .one(),
    );
    if (!targetCat) {
      throw new Error("Category not found");
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
      if (txn.categoryId === args.categoryId) {
        continue;
      }
      await tx.mutate.transaction.update({
        categoryId: args.categoryId,
        id: txnId,
        lockedFields: addLocked(txn.lockedFields, "category"),
      });
      await tx.mutate.transactionEdit.insert({
        actor: "user",
        createdAt: Date.now(),
        field: "category",
        id: editId,
        newValue: { categoryId: args.categoryId },
        oldValue: { categoryId: txn.categoryId },
        transactionId: txnId,
        userId: ctx.userId,
      });
    }
  }),

  bulkSetExcluded: defineMutator(bulkSetExcludedSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Not authenticated");
    }
    const txnIds = [...new Set(args.transactionIds)];
    for (const txnId of txnIds) {
      const txn = await tx.run(zql.transaction.where("id", txnId).one());
      if (!txn || txn.userId !== ctx.userId) {
        continue;
      }
      if (txn.excluded === args.excluded) {
        continue;
      }
      await tx.mutate.transaction.update({
        excluded: args.excluded,
        id: txnId,
      });
    }
  }),

  createTransaction: defineMutator(createTransactionSchema, async ({ args, ctx, tx }) => {
    await assertOwnsManualAccountForInsert(tx, ctx, args.accountId);
    if (!ctx?.userId) {
      throw new Error("Unauthorized");
    }
    const trimmedDesc = args.description?.trim();
    const flatLocation = args.location ? locationToFlat(args.location) : LOCATION_FLAT_NULL;
    await tx.mutate.transaction.insert({
      accountId: args.accountId,
      amount: args.amount,
      categoryId: args.categoryId ?? null,
      currency: args.currency ?? "USD",
      date: isoDateToEpochMs(args.date),
      id: args.id ?? crypto.randomUUID(),
      lockedFields: args.location ? ["location"] : [],
      merchantName: args.merchantName?.trim() ?? null,
      name: args.name.trim(),
      notes: trimmedDesc && trimmedDesc.length > 0 ? trimmedDesc : null,
      pending: false,
      source: "manual",
      userId: ctx.userId,
      website: args.website?.trim() ?? null,
      ...flatLocation,
    });
  }),

  deleteTransaction: defineMutator(transactionIdOnlySchema, async ({ args, ctx, tx }) => {
    await assertOwnsManualTransaction(tx, ctx, args.id);
    await tx.mutate.transaction.delete({ id: args.id });
  }),

  resetCategory: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
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
        oldValue: { categoryId: row.categoryId },
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

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

  resetLocation: defineMutator(transactionIdSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    const earliestEdit = await tx.run(
      zql.transactionEdit
        .where("transactionId", args.id)
        .where("field", "location")
        .orderBy("createdAt", "asc")
        .one(),
    );
    const original = (earliestEdit?.oldValue as LocationJson | null | undefined) ?? null;
    const flat = original ? locationToFlat(original) : LOCATION_FLAT_NULL;
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: removeLocked(row.lockedFields, "location"),
        ...flat,
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "location",
        newValue: null,
        oldValue: flatToLocation(row),
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

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

  updateCategory: defineMutator(updateCategorySchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        categoryId: args.categoryId,
        id: args.id,
        lockedFields: addLocked(row.lockedFields, "category"),
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "category",
        newValue: { categoryId: args.categoryId },
        oldValue: { categoryId: row.categoryId },
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

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

  updateLocation: defineMutator(updateLocationSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    await Promise.all([
      tx.mutate.transaction.update({
        id: args.id,
        lockedFields: addLocked(row.lockedFields, "location"),
        ...locationToFlat(args.location),
      }),
      appendEdit(tx, {
        editId: args.editId,
        field: "location",
        newValue: args.location,
        oldValue: flatToLocation(row),
        transactionId: args.id,
        userId,
      }),
    ]);
  }),

  updateMerchant: defineMutator(updateMerchantSchema, async ({ args, ctx, tx }) => {
    const { row, userId } = await getOwned(tx, ctx, args.id);
    const trimmedName = args.merchantName?.trim() ?? null;
    const nextName = trimmedName && trimmedName.length > 0 ? trimmedName : null;
    const trimmedSite = args.website?.trim() ?? null;
    const nextSite = trimmedSite && trimmedSite.length > 0 ? trimmedSite : null;
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
  }),

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
