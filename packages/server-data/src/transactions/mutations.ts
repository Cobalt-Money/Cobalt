import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { transactionEdit } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import { eq } from "drizzle-orm";
import type { z } from "zod";

import { setTransactionTags } from "../tags/mutations.js";
import type { transactionPatchBodySchema } from "./schemas.js";

export type TransactionPatchBody = z.infer<typeof transactionPatchBodySchema>;

type EditableField = "category" | "date" | "name" | "notes";

function captureOldCategory(
  row: Pick<
    typeof transaction.$inferSelect,
    "category" | "categoryDetail" | "categoryConfidence"
  >
): unknown {
  if (!row.category) {
    return null;
  }
  return {
    confidence: row.categoryConfidence,
    detailed: row.categoryDetail,
    primary: row.category,
  };
}

async function restoreOriginalValue(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  transactionId: string,
  field: EditableField
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

/**
 * Atomically applies a sparse patch to a transaction:
 * - Non-null field → update column, add to lockedFields, append transaction_edit row.
 * - null field (reset) → restore original from transaction_edit, remove from lockedFields.
 * - userOverrideLocation → plain column update (not tracked in transaction_edit).
 */
export async function patchTransaction(
  transactionId: string,
  userId: string,
  patch: TransactionPatchBody
): Promise<void> {
  const { category, date, name, notes, tags, userOverrideLocation } = patch;

  await db.transaction(async (tx) => {
    // Fetch current row once for old_value capture.
    const current = await tx.query.transaction.findFirst({
      columns: {
        category: true,
        categoryConfidence: true,
        categoryDetail: true,
        date: true,
        lockedFields: true,
        name: true,
        notes: true,
      },
      where: { id: { eq: transactionId } },
    });

    if (!current) {
      return;
    }

    const columnUpdates: Partial<typeof transaction.$inferInsert> = {};
    const addToLocked: EditableField[] = [];
    const removeFromLocked: EditableField[] = [];
    const editRows: (typeof transactionEdit.$inferInsert)[] = [];

    // ── name ──────────────────────────────────────────────────────────────
    if (name !== undefined) {
      if (name === null) {
        const original = await restoreOriginalValue(tx, transactionId, "name");
        if (typeof original === "string") {
          columnUpdates.name = original;
        }
        removeFromLocked.push("name");
      } else {
        columnUpdates.name = name;
        addToLocked.push("name");
        editRows.push({
          actor: "user",
          field: "name",
          newValue: name,
          oldValue: current.name,
          transactionId,
          userId,
        });
      }
    }

    // ── date ──────────────────────────────────────────────────────────────
    if (date !== undefined) {
      if (date === null) {
        const original = await restoreOriginalValue(tx, transactionId, "date");
        if (typeof original === "string") {
          columnUpdates.date = original;
        }
        removeFromLocked.push("date");
      } else {
        columnUpdates.date = date;
        addToLocked.push("date");
        editRows.push({
          actor: "user",
          field: "date",
          newValue: date,
          oldValue: current.date,
          transactionId,
          userId,
        });
      }
    }

    // ── category ──────────────────────────────────────────────────────────
    if (category !== undefined) {
      if (category === null) {
        const original = await restoreOriginalValue(
          tx,
          transactionId,
          "category"
        );
        if (original && typeof original === "object") {
          const parsed = original as {
            confidence: string | null;
            detailed: string | null;
            primary: string;
          };
          columnUpdates.category = parsed.primary;
          columnUpdates.categoryDetail = parsed.detailed;
          columnUpdates.categoryConfidence = parsed.confidence;
        }
        removeFromLocked.push("category");
      } else {
        columnUpdates.category = category.primary;
        columnUpdates.categoryDetail = category.detailed;
        columnUpdates.categoryConfidence = null;
        addToLocked.push("category");
        editRows.push({
          actor: "user",
          field: "category",
          newValue: { detailed: category.detailed, primary: category.primary },
          oldValue: captureOldCategory(current),
          transactionId,
          userId,
        });
      }
    }

    // ── notes ─────────────────────────────────────────────────────────────
    if (notes !== undefined) {
      columnUpdates.notes = notes;
      if (notes === null) {
        removeFromLocked.push("notes");
      } else {
        addToLocked.push("notes");
        editRows.push({
          actor: "user",
          field: "notes",
          newValue: notes,
          oldValue: current.notes,
          transactionId,
          userId,
        });
      }
    }

    // ── userOverrideLocation (plain override, no audit log) ────────────────
    if (userOverrideLocation !== undefined) {
      columnUpdates.userOverrideLocation = userOverrideLocation;
    }

    // ── Apply lockedFields mutations ───────────────────────────────────────
    const updatedLocked = [
      ...current.lockedFields.filter(
        (f) => !removeFromLocked.includes(f as EditableField)
      ),
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
