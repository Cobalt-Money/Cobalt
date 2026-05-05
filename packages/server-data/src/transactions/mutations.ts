import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { transactionEdit } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import { eq } from "drizzle-orm";
import type { z } from "zod";

import { normalizeWebsite } from "./lib.js";
import type { transactionPatchBodySchema } from "./schemas.js";
import { setTransactionTags } from "./tags/mutations.js";

export type TransactionPatchBody = z.infer<typeof transactionPatchBodySchema>;

type EditableField = "category" | "date" | "merchantName" | "name" | "notes";

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
 * - Non-null field → update column, add to lockedFields, append transaction_edit row.
 * - null field (reset) → restore original from transaction_edit, remove from lockedFields.
 * - userOverrideLocation → plain column update (not tracked in transaction_edit).
 */
export async function patchTransaction(
  transactionId: string,
  userId: string,
  patch: TransactionPatchBody,
): Promise<void> {
  const { categoryId, date, merchantName, name, notes, tags, userOverrideLocation, website } =
    patch;

  await db.transaction(async (tx) => {
    // Fetch current row once for old_value capture.
    const current = await tx.query.transaction.findFirst({
      columns: {
        categoryId: true,
        date: true,
        lockedFields: true,
        merchantName: true,
        name: true,
        notes: true,
      },
      where: { id: { eq: transactionId } },
    });

    if (!current) {
      return;
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

    // ── category (object-valued audit) ───────────────────────────────────
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

    // ── notes (null clears, no restore from history) ─────────────────────
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

    // ── website (paired with merchantName, plain update; no separate audit) ─
    if (website !== undefined) {
      ctx.columnUpdates.website = normalizeWebsite(website);
    }

    // ── userOverrideLocation (plain override, no audit log) ────────────────
    if (userOverrideLocation !== undefined) {
      ctx.columnUpdates.userOverrideLocation = userOverrideLocation;
    }

    const { addToLocked, columnUpdates, editRows, removeFromLocked } = ctx;

    // ── Apply lockedFields mutations ───────────────────────────────────────
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

  // Tag membership replace runs in its own transaction (cross-table writes
  // + ownership validation already handled in setTransactionTags).
  if (tags !== undefined) {
    await setTransactionTags(userId, transactionId, tags);
  }
}
