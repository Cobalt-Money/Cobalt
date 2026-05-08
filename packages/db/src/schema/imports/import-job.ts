import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/** Provider the import was sourced from. Single value pending the AI-mapped generic CSV adapter. */
export const importSource = pgEnum("import_source", ["csv"]);

/**
 * Pipeline state. Linear progression: uploaded → parsed → mapped → committed.
 * `failed` is terminal from any prior state.
 */
export const importJobStatus = pgEnum("import_job_status", [
  "uploaded",
  "parsed",
  "mapped",
  "committed",
  "failed",
]);

export const importJob = pgTable(
  "import_job",
  {
    /** {sourceAccountName: cobaltAccountId}; populated at the mapping stage. */
    accountMap: jsonb("account_map").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** Set when status=failed; nullable otherwise. */
    errorMessage: text("error_message"),
    /** Blob storage key (Vercel Blob path); cleared after `committed`. */
    fileKey: text("file_key"),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Original upload filename for UI display. */
    originalFilename: text("original_filename"),
    source: importSource("source").notNull(),
    status: importJobStatus("status").default("uploaded").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("import_job_user_id_idx").on(t.userId),
    index("import_job_user_status_idx").on(t.userId, t.status),
  ],
);

export type ImportJob = typeof importJob.$inferSelect;
export type ImportJobInsert = typeof importJob.$inferInsert;
