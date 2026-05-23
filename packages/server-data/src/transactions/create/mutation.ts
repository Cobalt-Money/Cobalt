import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";

import { ApiError } from "../_shared/errors.js";
import { normalizeWebsite } from "../_shared/lib.js";
import { LOCATION_FLAT_COLS, locationToFlat } from "../_shared/location.js";
import type { CreateTransaction } from "./schema.js";

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
  bodies: CreateTransaction[],
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
    const trimmedNotes = body.notes?.trim();
    const flatLocation = body.location ? locationToFlat(body.location) : LOCATION_FLAT_COLS;
    return {
      accountId: body.accountId,
      amount: body.amount.toString(),
      categoryId: body.categoryId ?? null,
      currency: body.currency ?? "USD",
      date: body.date,
      ...(body.id ? { id: body.id } : {}),
      lockedFields: body.location ? ["location"] : [],
      merchantName: body.merchantName?.trim() ?? null,
      name: body.name.trim(),
      notes: trimmedNotes && trimmedNotes.length > 0 ? trimmedNotes : null,
      pending: false,
      source: "manual" as const,
      userId,
      website: body.website ? normalizeWebsite(body.website) : null,
      ...flatLocation,
    };
  });

  const inserted = await db.insert(transaction).values(rows).returning({ id: transaction.id });
  return { ids: inserted.map((r) => r.id) };
}
