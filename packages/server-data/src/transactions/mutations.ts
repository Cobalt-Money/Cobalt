import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { transactionEdit } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import type { LocationJson } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { eq } from "drizzle-orm";
import type { z } from "zod";

import { ApiError } from "./errors.js";
import { normalizeWebsite } from "./lib.js";
import type { TransactionCreateBody, transactionPatchBodySchema } from "./schemas.js";
import { setTransactionTags } from "./tags/mutations.js";

export type TransactionPatchBody = z.infer<typeof transactionPatchBodySchema>;

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

const LOCATION_FLAT_COLS = {
  address: null,
  city: null,
  country: null,
  lat: null,
  lon: null,
  postalCode: null,
  region: null,
  storeNumber: null,
} as const;

function locationToFlat(loc: LocationJson): Partial<typeof transaction.$inferInsert> {
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

function flatToLocation(row: {
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  postalCode: string | null;
  region: string | null;
  storeNumber: string | null;
}): LocationJson {
  return {
    address: row.address,
    city: row.city,
    country: row.country,
    lat: row.lat,
    lon: row.lon,
    postal_code: row.postalCode,
    region: row.region,
    store_number: row.storeNumber,
  };
}

/**
 * Atomically applies a sparse patch to a transaction:
 * - Non-null field → update column(s), add to lockedFields, append transaction_edit row.
 * - null field (reset) → restore original from transaction_edit, remove from lockedFields.
 */
export async function patchTransaction(
  transactionId: string,
  userId: string,
  patch: TransactionPatchBody,
): Promise<void> {
  const { categoryId, date, location, merchantName, name, notes, tags, website } = patch;

  await db.transaction(async (tx) => {
    // Fetch current row once for old_value capture.
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

    // ── location (composite; writes 8 flat cols + single "location" lock) ─
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

/**
 * Insert one or many manual transactions onto user-owned manual accounts.
 * Mirrors the Zero `m.transaction.createTransaction` mutator so the OAuth /
 * SDK path and the web-session path stay consistent: only manual accounts
 * accept inserts, rows are stamped `source: "manual"`, `pending: false`,
 * `userId`, and `location` (when supplied) is added to `lockedFields` so a
 * future provider sync can't overwrite it.
 *
 * Validates ownership + `source === "manual"` for every distinct accountId
 * in one query, then bulk-inserts in a single statement. All-or-nothing —
 * any unowned / non-manual account rejects the whole call before any insert
 * happens. `ids` order matches input order.
 */
export async function createManualTransactions(
  userId: string,
  bodies: TransactionCreateBody[],
): Promise<{ ids: string[] }> {
  if (bodies.length === 0) {
    return { ids: [] };
  }

  const distinctAccountIds = [...new Set(bodies.map((b) => b.accountId))];
  const accounts = await db.query.financialAccount.findMany({
    columns: { id: true, source: true, userId: true },
    where: { id: { in: distinctAccountIds } },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));
  for (const accountId of distinctAccountIds) {
    const a = byId.get(accountId);
    if (!a || a.userId !== userId) {
      throw new ApiError(404, "account_not_found", "Account not found");
    }
    if (a.source !== "manual") {
      throw new ApiError(
        400,
        "account_not_manual",
        "Transactions can only be added to manual accounts",
      );
    }
  }

  const rows = bodies.map((body) => {
    const trimmedDesc = body.description?.trim();
    const flatLocation = body.location ? locationToFlat(body.location) : LOCATION_FLAT_COLS;
    const id = body.id ?? crypto.randomUUID();
    return {
      accountId: body.accountId,
      amount: body.amount.toString(),
      categoryId: body.categoryId ?? null,
      currency: body.currency ?? "USD",
      date: body.date,
      id,
      lockedFields: body.location ? ["location"] : [],
      merchantName: body.merchantName?.trim() ?? null,
      name: body.name.trim(),
      notes: trimmedDesc && trimmedDesc.length > 0 ? trimmedDesc : null,
      pending: false,
      source: "manual" as const,
      userId,
      website: body.website ? normalizeWebsite(body.website) : null,
      ...flatLocation,
    };
  });

  await db.insert(transaction).values(rows);
  return { ids: rows.map((r) => r.id) };
}
