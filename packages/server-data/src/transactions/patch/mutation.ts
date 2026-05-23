import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { transactionEdit } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import type { LocationJson } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { eq } from "drizzle-orm";

import { ApiError } from "../_shared/errors.js";
import { normalizeWebsite } from "../_shared/lib.js";
import { flatToLocation, LOCATION_FLAT_COLS, locationToFlat } from "../_shared/location.js";
import { setTransactionTags } from "../tags/mutations.js";
import type { PatchTransaction } from "./schema.js";

type EditableField = "category" | "date" | "location" | "merchantName" | "name" | "notes";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function restoreOriginalValue(
  tx: DbTx,
  transactionId: string,
  field: EditableField,
): Promise<unknown> {
  const row = await tx.query.transactionEdit.findFirst({
    columns: { oldValue: true },
    orderBy: { createdAt: "asc" },
    where: {
      field: { eq: field },
      transactionId: { eq: transactionId },
    },
  });
  return row?.oldValue ?? null;
}

interface FieldEditContext {
  tx: DbTx;
  transactionId: string;
  userId: string;
  columnUpdates: Partial<typeof transaction.$inferInsert>;
  addToLocked: EditableField[];
  removeFromLocked: EditableField[];
  editRows: (typeof transactionEdit.$inferInsert)[];
}

/**
 * Apply set-or-restore-on-null semantics for a string-valued auditable field
 * (name, date, merchantName). On `null`, restores from the earliest
 * `transaction_edit` row; on a value, updates + locks + appends an audit row.
 */
async function applyStringFieldEdit(
  ctx: FieldEditContext,
  field: EditableField & ("date" | "merchantName" | "name"),
  value: string | null | undefined,
  currentValue: string | null,
): Promise<void> {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    const original = await restoreOriginalValue(ctx.tx, ctx.transactionId, field);
    if (typeof original === "string") {
      (ctx.columnUpdates as Record<string, unknown>)[field] = original;
    } else if (field === "merchantName") {
      ctx.columnUpdates.merchantName = null;
    }
    ctx.removeFromLocked.push(field);
    return;
  }
  (ctx.columnUpdates as Record<string, unknown>)[field] = value;
  ctx.addToLocked.push(field);
  ctx.editRows.push({
    actor: "user",
    field,
    newValue: value,
    oldValue: currentValue,
    transactionId: ctx.transactionId,
    userId: ctx.userId,
  });
}

/**
 * Atomically applies a sparse patch to a transaction:
 * - Non-null field → update column(s), add to lockedFields, append transaction_edit row.
 * - null field (reset) → restore original from transaction_edit, remove from lockedFields.
 */
export async function patchTransaction(
  transactionId: string,
  userId: string,
  patch: PatchTransaction,
): Promise<void> {
  const { categoryId, date, location, merchantName, name, notes, tags, website } = patch;

  await db.transaction(async (tx) => {
    const current = await tx.query.transaction.findFirst({
      columns: {
        address: true,
        categoryId: true,
        city: true,
        country: true,
        date: true,
        lat: true,
        lockedFields: true,
        lon: true,
        merchantName: true,
        name: true,
        notes: true,
        postalCode: true,
        region: true,
        storeNumber: true,
      },
      where: { id: { eq: transactionId }, userId: { eq: userId } },
    });

    if (!current) {
      throw new ApiError(404, "transaction_not_found", "Transaction not found");
    }

    const ctx: FieldEditContext = {
      addToLocked: [],
      columnUpdates: {},
      editRows: [],
      removeFromLocked: [],
      transactionId,
      tx,
      userId,
    };

    await applyStringFieldEdit(ctx, "name", name, current.name);
    await applyStringFieldEdit(ctx, "date", date, current.date);
    await applyStringFieldEdit(ctx, "merchantName", merchantName, current.merchantName);

    if (categoryId !== undefined) {
      if (categoryId === null) {
        const original = await restoreOriginalValue(tx, transactionId, "category");
        if (original && typeof original === "object") {
          const parsed = original as { categoryId: string | null };
          if (parsed.categoryId) {
            ctx.columnUpdates.categoryId = parsed.categoryId;
          }
        }
        ctx.removeFromLocked.push("category");
      } else {
        ctx.columnUpdates.categoryId = categoryId;
        ctx.addToLocked.push("category");
        ctx.editRows.push({
          actor: "user",
          field: "category",
          newValue: { categoryId },
          oldValue: { categoryId: current.categoryId },
          transactionId,
          userId,
        });
      }
    }

    if (notes !== undefined) {
      ctx.columnUpdates.notes = notes;
      if (notes === null) {
        ctx.removeFromLocked.push("notes");
      } else {
        ctx.addToLocked.push("notes");
        ctx.editRows.push({
          actor: "user",
          field: "notes",
          newValue: notes,
          oldValue: current.notes,
          transactionId,
          userId,
        });
      }
    }

    if (website !== undefined) {
      ctx.columnUpdates.website = normalizeWebsite(website);
    }

    if (location !== undefined) {
      const currentLocation = flatToLocation(current);
      if (location === null) {
        const original = await restoreOriginalValue(tx, transactionId, "location");
        if (original && typeof original === "object") {
          Object.assign(ctx.columnUpdates, locationToFlat(original as LocationJson));
        } else {
          Object.assign(ctx.columnUpdates, LOCATION_FLAT_COLS);
        }
        ctx.removeFromLocked.push("location");
      } else {
        Object.assign(ctx.columnUpdates, locationToFlat(location));
        ctx.addToLocked.push("location");
        ctx.editRows.push({
          actor: "user",
          field: "location",
          newValue: location,
          oldValue: currentLocation,
          transactionId,
          userId,
        });
      }
    }

    const { addToLocked, columnUpdates, editRows, removeFromLocked } = ctx;

    const updatedLocked = [
      ...current.lockedFields.filter((f) => !removeFromLocked.includes(f as EditableField)),
      ...addToLocked.filter((f) => !current.lockedFields.includes(f)),
    ];

    const hasColumnUpdates = Object.keys(columnUpdates).length > 0;
    const lockedChanged =
      updatedLocked.length !== current.lockedFields.length ||
      updatedLocked.some((f, i) => f !== current.lockedFields[i]);

    if (hasColumnUpdates || lockedChanged) {
      await tx
        .update(transaction)
        .set({ ...columnUpdates, lockedFields: updatedLocked })
        .where(eq(transaction.id, transactionId));
    }

    if (editRows.length > 0) {
      await tx.insert(transactionEdit).values(editRows);
    }
  });

  // Tag membership replace runs in its own transaction.
  if (tags !== undefined) {
    await setTransactionTags(userId, transactionId, tags);
  }
}
