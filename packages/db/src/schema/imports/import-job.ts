import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "../users/auth/auth";

/** Provider the import was sourced from. Single value pending the AI-mapped generic CSV adapter. */
export const importSource = pgEnum("import_source", ["csv"]);

/**
 * Pipeline state.
 *   uploaded → column_mapped → account_mapped → category_mapped → committing → committed
 *                                                                          ↘ failed
 *                                                                          ↘ cancelled
 */
export const importJobStatus = pgEnum("import_job_status", [
  "uploaded",
  "column_mapped",
  "account_mapped",
  "category_mapped",
  "committing",
  "committed",
  "failed",
  "cancelled",
]);

/** AI-inferred CSV column → Cobalt-field mapping persisted on the job after Step 2 confirm. */
export interface CsvMapping {
  /** Date column + parse format. `kind: "missing"` falls back to `defaultDate`. */
  date: { kind: "column"; column: string; format: string } | { kind: "missing" };
  /** Amount carrier: signed single column, split debit/credit, or magnitude+typeColumn. */
  amount:
    | {
        kind: "signed";
        column: string;
        signConvention: "outflow_negative" | "outflow_positive";
        parensNegative: boolean;
      }
    | { kind: "split"; outflowColumn: string; inflowColumn: string }
    | {
        kind: "magnitude_type";
        magnitudeColumn: string;
        typeColumn: string;
        debitValues: string[];
      };
  merchant: { column: string };
  account: { column: string } | null;
  category: { column: string } | null;
  notes: { column: string } | null;
  originalDescription: { column: string } | null;
  tags: { column: string; delimiter: string } | null;
  /** Optional rule for marking transfers — applied row-wise post-parse. */
  transferRule:
    | { kind: "category_match"; values: string[] }
    | { kind: "type_match"; column: string; values: string[] }
    | { kind: "merchant_prefix"; prefixes: string[] }
    | null;
  excludeRule: { column: string; trueValues: string[] } | null;
  confidence: number;
}

/**
 * Pending-account-create intent stored on `accountResolution` before commit.
 * The actual `financial_account` row is inserted by `applyAccountCreatesStep`
 * so abandoned imports don't leave orphan accounts on the user's /accounts page.
 */
export interface PendingAccountCreate {
  kind: "pendingCreate";
  name: string;
  type: "depository" | "credit" | "investment" | "loan";
  subtype: string;
  institutionName?: string;
  institutionLogoDomain?: string;
}

/**
 * Step 3 output: source-account-name (or single-shot) → resolved entry.
 * Map values are either an existing `accountId`, the string `"skip"`, or a
 * `PendingAccountCreate` that gets materialised at commit time.
 */
export type AccountResolution =
  | { kind: "single"; accountId: string }
  | { kind: "single"; pendingCreate: PendingAccountCreate }
  | {
      kind: "perLabel";
      map: Record<string, string | "skip" | PendingAccountCreate>;
    };

/** Step 4 output: source category → Cobalt categoryId, plus pending creates applied at commit. */
export interface CategoryResolution {
  /** sourceLabel → categoryId (uncategorized fallback already resolved). */
  map: Record<string, string>;
  pendingCreates: {
    color?: string;
    groupId: string;
    iconKey: string;
    name: string;
    sourceLabel: string;
  }[];
}

/** Cached AI account-mapping suggestions, persisted on first GET so resume skips re-inference. */
export interface AccountSuggestionPersisted {
  sourceLabel: string;
  target: string | "create_new" | "skip";
  newName?: string;
  suggestedType?: string;
  suggestedSubtype?: string;
  suggestedInstitutionName?: string;
  suggestedInstitutionDomain?: string;
  confidence: number;
  fromCache: boolean;
}

/** Cached AI category-mapping suggestions, persisted on first GET so resume skips re-inference. */
export interface CategorySuggestionPersisted {
  sourceLabel: string;
  action: "link" | "create" | "skip";
  targetCategoryId: string | null;
  newCategory?: {
    name: string;
    iconKey: string;
    groupId: string;
    color?: string;
  };
  confidence: number;
  fromCache: boolean;
}

/** Live progress payload, written per chunk during the commit workflow. */
export interface ImportProgress {
  done: number;
  message?: string;
  startedAt: string;
  step: "loading" | "applying_creates" | "inserting" | "finalizing";
  total: number;
  updatedAt: string;
}

/** Terminal counts surfaced to the post-commit screen. */
export interface ImportSummary {
  duplicates: number;
  excluded: number;
  failed: number;
  imported: number;
  /** Per-row reject reasons captured during chunked insert. Capped to 50 for UI. */
  rejected: { row: number; reason: string }[];
}

export const importJob = pgTable(
  "import_job",
  {
    /**
     * Step 3 output. Replaces the legacy `accountMap` field. JSON shape:
     * `{ kind: "single", accountId } | { kind: "perLabel", map: {label: id|"skip"} }`.
     */
    accountResolution: jsonb("account_resolution").$type<AccountResolution>(),
    /** Cached AI account-mapping suggestions; populated on first GET to avoid re-inference on resume. */
    accountSuggestions: jsonb("account_suggestions").$type<AccountSuggestionPersisted[]>(),
    /** Cancellation timestamp; workflow checks between chunks and exits keeping partial inserts. */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** Step 4 output: resolved map + pending creates/renames applied at commit. */
    categoryResolution: jsonb("category_resolution").$type<CategoryResolution>(),
    /** Cached AI category-mapping suggestions; populated on first GET to avoid re-inference on resume. */
    categorySuggestions: jsonb("category_suggestions").$type<CategorySuggestionPersisted[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** Set when status=failed; nullable otherwise. */
    errorMessage: text("error_message"),
    /** SHA256 of upload bytes. Backs the 30-day duplicate-import guard. */
    fileHash: text("file_hash"),
    /** Vercel Blob URL for the uploaded CSV; cleared after `committed`. */
    fileKey: text("file_key"),
    /** Header row captured at upload, used by Step 2 UI without blob fetch. */
    headers: text("headers")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Original upload filename for UI display. */
    originalFilename: text("original_filename"),
    /** Live commit-workflow progress; updated per chunk. */
    progress: jsonb("progress").$type<ImportProgress>(),
    /** First 20 parsed rows captured at upload, used by Step 2 UI sample preview. */
    sampleRows: jsonb("sample_rows").$type<Record<string, string>[]>(),
    /** When the user accepted the column mapping in Step 2. */
    schemaConfirmedAt: timestamp("schema_confirmed_at", { withTimezone: true }),
    /** AI-inferred or user-confirmed column → Cobalt-field mapping. */
    schemaMapping: jsonb("schema_mapping").$type<CsvMapping>(),
    source: importSource("source").notNull(),
    status: importJobStatus("status").default("uploaded").notNull(),
    /** Terminal counts written by `markCommittedStep`. */
    summary: jsonb("summary").$type<ImportSummary>(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** WDK run handle for cancel/inspect. */
    workflowRunId: text("workflow_run_id"),
  },
  (t) => [
    index("import_job_user_id_idx").on(t.userId),
    index("import_job_user_status_idx").on(t.userId, t.status),
    index("import_job_user_file_hash_idx").on(t.userId, t.fileHash),
  ],
);

export type ImportJob = typeof importJob.$inferSelect;
export type ImportJobInsert = typeof importJob.$inferInsert;
