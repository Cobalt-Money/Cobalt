import { boolean, date, index, jsonb, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { transaction } from "../accounts/banking/transactions/transaction";
import { importJob } from "./import-job";

export const importStagedTransaction = pgTable(
  "import_staged_transaction",
  {
    /**
     * Signed amount in Cobalt convention (negative = outflow).
     * Adapters flip provider-specific signs in `normalize()` before staging.
     */
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    date: date("date").notNull(),
    /** Set if dedupe pass matches against an existing `transaction.id`; row is excluded from commit. */
    dedupeMatchId: uuid("dedupe_match_id").references(() => transaction.id, {
      onDelete: "set null",
    }),
    /** Provider-supplied stable id (e.g. OFX FITID). Null when source has no per-row id. */
    externalId: text("external_id"),
    id: uuid("id").defaultRandom().primaryKey(),
    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),
    isSplit: boolean("is_split").default(false).notNull(),
    isTransfer: boolean("is_transfer").default(false).notNull(),
    merchant: text("merchant").notNull(),
    notes: text("notes"),
    /** Raw bank-feed string from source CSV (e.g. an "Original Description" column); preserved separately from user-edited merchant. */
    originalDescription: text("original_description"),
    /** Per-row parse error; row is skipped at commit. */
    parseError: text("parse_error"),
    /** Original row from the source file, untouched, for debugging adapter bugs. */
    rawBlob: jsonb("raw_blob"),
    /** Source account label from the file, pre-mapping. */
    sourceAccountName: text("source_account_name").notNull(),
    /** Source category label from the file, pre-mapping. */
    sourceCategoryName: text("source_category_name"),
    tags: text("tags").array(),
  },
  (t) => [
    index("import_staged_transaction_job_id_idx").on(t.importJobId),
    index("import_staged_transaction_dedupe_match_idx").on(t.dedupeMatchId),
  ],
);

export type ImportStagedTransaction = typeof importStagedTransaction.$inferSelect;
export type ImportStagedTransactionInsert = typeof importStagedTransaction.$inferInsert;
