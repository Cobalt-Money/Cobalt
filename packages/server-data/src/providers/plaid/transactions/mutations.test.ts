import { LOCK_KEY_GUARDED_COLUMNS } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { describe, expect, it } from "vitest";

import { PLAID_UPSERT_SET } from "./mutations.js";

/**
 * Regression guard for the lockedFields / Plaid upsert contract.
 *
 * `LOCK_KEY_GUARDED_COLUMNS` is the single source of truth declaring which
 * `transaction` columns must be preserved (not overwritten by Plaid's
 * `excluded.X`) when the user has locked the corresponding field. The Plaid
 * upsert SQL is built from this map. These tests assert the SQL actually
 * encodes the gate for every guarded column — so a future "added a new lock
 * key but forgot to wire it in upsert" regression fails here.
 */
describe("PLAID_UPSERT_SET", () => {
  function setSqlAsString(col: string): string {
    const sql = PLAID_UPSERT_SET[col];
    if (!sql) {
      throw new Error(`column "${col}" missing from PLAID_UPSERT_SET`);
    }
    // drizzle SQL holds the raw query in `.queryChunks` / `.toString()` —
    // `String(sql)` returns the assembled SQL text we need to grep.
    return JSON.stringify(sql);
  }

  /**
   * Plaid never writes some user-only columns (notes), so a lock on them is
   * informational — they don't appear in the upsert `set`. If Plaid ever
   * starts writing one of these, the entry in `LOCK_KEY_GUARDED_COLUMNS`
   * means the gating just needs the col to be added to `plaidWritableColumns`.
   */
  it.each(
    Object.entries(LOCK_KEY_GUARDED_COLUMNS).flatMap(([lockKey, cols]) =>
      cols.map((col) => [lockKey, col] as const),
    ),
  )("gates column %s on lockedFields ? '%s' (when Plaid writes it)", (lockKey, col) => {
    const sql = PLAID_UPSERT_SET[col];
    if (!sql) {
      // Plaid does not write this column today. The lock entry is forward
      // protection: if it ever joins `plaidWritableColumns`, the gate is
      // applied automatically and this test will start asserting it.
      return;
    }
    const text = setSqlAsString(col);
    expect(text).toContain("locked_fields");
    expect(text).toContain(`'${lockKey}'`);
    expect(text.toUpperCase()).toContain("CASE WHEN");
  });

  it("does not gate columns Plaid is allowed to clobber", () => {
    // Spot-check a representative ungated column. Plaid is the source of
    // truth for these — they must NOT have a lockedFields CASE WHEN.
    const ungatedSamples = [
      "amount",
      "authorizedDate",
      "counterparties",
      "logoUrl",
      "pending",
    ] as const;
    for (const col of ungatedSamples) {
      const text = setSqlAsString(col);
      expect(text).not.toContain("locked_fields");
    }
  });

  it("declares a guard entry for every editable lock key", () => {
    // `LOCK_KEY_GUARDED_COLUMNS satisfies Record<TransactionEditFieldName, …>`
    // already enforces this at compile time, but mirror it as a runtime
    // assertion so the failure mode shows up in test output too.
    const expectedKeys = [
      "amount",
      "category",
      "date",
      "location",
      "merchantName",
      "name",
      "notes",
      "tags",
    ];
    for (const key of expectedKeys) {
      expect(LOCK_KEY_GUARDED_COLUMNS).toHaveProperty(key);
    }
  });

  it("references real columns on the transaction table", () => {
    const tableCols = new Set(Object.keys(transactionTable));
    for (const cols of Object.values(LOCK_KEY_GUARDED_COLUMNS)) {
      for (const col of cols) {
        expect(tableCols).toContain(col);
      }
    }
  });
});
