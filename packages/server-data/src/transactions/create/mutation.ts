import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { eq, sql } from "drizzle-orm";

import { upsertManualBalanceSnapshotsForUser } from "../../snapshots/mutations.js";
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

  // Wrap insert + per-account balance deltas in a single transaction so a
  // mid-call failure can't leave tx rows persisted with a stale balance.
  // Canonical sign: transaction.amount positive = inflow, so `balance.current
  // += sum(amount)` works for both assets and liabilities (liabilities are
  // already stored negative).
  const deltasByAccount = new Map<string, number>();
  for (const b of bodies) {
    deltasByAccount.set(b.accountId, (deltasByAccount.get(b.accountId) ?? 0) + b.amount);
  }
  const inserted = await db.transaction(async (tx) => {
    const ins = await tx.insert(transaction).values(rows).returning({ id: transaction.id });
    for (const [accountId, delta] of deltasByAccount) {
      if (delta === 0) {
        continue;
      }
      await tx
        .update(balance)
        .set({ current: sql`${balance.current} + ${delta.toString()}` })
        .where(eq(balance.accountId, accountId));
    }
    return ins;
  });

  // Snapshot reads the now-committed balance; runs outside the tx so a slow
  // snapshot write doesn't hold tx-table locks. Derived view — safe to retry.
  await upsertManualBalanceSnapshotsForUser(userId);

  return { ids: inserted.map((r) => r.id) };
}
