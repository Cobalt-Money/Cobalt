import { z } from "@hono/zod-openapi";

/**
 * HTTP-boundary zod schemas for the AI-mapped CSV import flow (SRI-321).
 *
 * Step ordering:
 *   1. POST /imports                 — upload + gates → `uploaded`
 *   2. POST /imports/:id/column-map  — confirm mapping → `column_mapped`
 *   3. POST /imports/:id/account-map — confirm accounts → `account_mapped`
 *   4. POST /imports/:id/category-map— confirm categories → `category_mapped`
 *   5. POST /imports/:id/commit      — trigger workflow → `committing` → `committed`
 */

export const importJobIdParamSchema = z.object({
  id: z.string().uuid(),
});

/* ------------------------------------------------------------------ */
/* Step 2 — column mapping                                            */
/* ------------------------------------------------------------------ */

export const csvMappingSchema = z.object({
  account: z.object({ column: z.string() }).nullable(),
  amount: z.discriminatedUnion("kind", [
    z.object({
      column: z.string(),
      kind: z.literal("signed"),
      parensNegative: z.boolean(),
      signConvention: z.enum(["outflow_negative", "outflow_positive"]),
    }),
    z.object({
      inflowColumn: z.string(),
      kind: z.literal("split"),
      outflowColumn: z.string(),
    }),
    z.object({
      debitValues: z.array(z.string()),
      kind: z.literal("magnitude_type"),
      magnitudeColumn: z.string(),
      typeColumn: z.string(),
    }),
  ]),
  category: z.object({ column: z.string() }).nullable(),
  confidence: z.number().min(0).max(1),
  date: z.discriminatedUnion("kind", [
    z.object({
      column: z.string(),
      format: z.string(),
      kind: z.literal("column"),
    }),
    z.object({ kind: z.literal("missing") }),
  ]),
  excludeRule: z.object({ column: z.string(), trueValues: z.array(z.string()) }).nullable(),
  merchant: z.object({ column: z.string() }),
  notes: z.object({ column: z.string() }).nullable(),
  originalDescription: z.object({ column: z.string() }).nullable(),
  tags: z.object({ column: z.string(), delimiter: z.string() }).nullable(),
  transferRule: z
    .discriminatedUnion("kind", [
      z.object({
        kind: z.literal("category_match"),
        values: z.array(z.string()),
      }),
      z.object({
        column: z.string(),
        kind: z.literal("type_match"),
        values: z.array(z.string()),
      }),
      z.object({
        kind: z.literal("merchant_prefix"),
        prefixes: z.array(z.string()),
      }),
    ])
    .nullable(),
});

export const confirmColumnMappingBodySchema = z.object({
  /** When mapping.account === null — applied to every row. */
  defaultAccountName: z.string().min(1).optional(),
  /** When mapping.date.kind === "missing". */
  defaultDate: z.string().optional(),
  mapping: csvMappingSchema,
  /**
   * Pre-resolved single-account choice from the upload gate. When set, server
   * skips Step 3 (account mapping) and jumps directly to `account_mapped`.
   * Only honored when the confirmed mapping has `account: null`.
   */
  singleAccountChoice: z
    .discriminatedUnion("kind", [
      z.object({ accountId: z.uuid(), kind: z.literal("existing") }),
      z.object({
        institutionLogoDomain: z.string().max(255).optional(),
        institutionName: z.string().max(255).optional(),
        kind: z.literal("create"),
        name: z.string().min(1),
      }),
    ])
    .optional(),
});
export type ConfirmColumnMappingBody = z.infer<typeof confirmColumnMappingBodySchema>;

export const columnMappingResponseSchema = z.object({
  fromCache: z.boolean(),
  headers: z.array(z.string()),
  mapping: csvMappingSchema,
  sampleRows: z.array(z.record(z.string(), z.string())),
});
export type ColumnMappingResponse = z.infer<typeof columnMappingResponseSchema>;

/* ------------------------------------------------------------------ */
/* Step 3 — account mapping                                           */
/* ------------------------------------------------------------------ */

const accountChoiceSchema = z.discriminatedUnion("kind", [
  z.object({ accountId: z.string().uuid(), kind: z.literal("existing") }),
  z.object({
    /** Brandfetch domain (e.g. "wellsfargo.com") for logo + grouping. Optional. */
    institutionLogoDomain: z.string().max(255).optional(),
    /** Bank/brokerage display name (e.g. "Wells Fargo") for visual grouping. Optional. */
    institutionName: z.string().max(255).optional(),
    kind: z.literal("create"),
    name: z.string().min(1).max(255),
    subtype: z.string().min(1).max(64),
    type: z.enum(["depository", "credit", "investment", "loan"]),
  }),
  z.object({ kind: z.literal("skip") }),
]);
export type AccountChoice = z.infer<typeof accountChoiceSchema>;

export const confirmAccountMappingBodySchema = z.discriminatedUnion("kind", [
  /** Path A — per-label resolution. */
  z.object({
    kind: z.literal("perLabel"),
    map: z.record(z.string(), accountChoiceSchema),
  }),
  /** Path B — single shared account for all rows. */
  z.object({ choice: accountChoiceSchema, kind: z.literal("single") }),
]);
export type ConfirmAccountMappingBody = z.infer<typeof confirmAccountMappingBodySchema>;

export const accountSuggestionsResponseSchema = z.object({
  /** Path discriminator derived from confirmed CsvMapping. */
  path: z.enum(["A", "B"]),
  sourceLabels: z.array(z.string()),
  /** AI suggestion per label (Path A only). */
  suggestions: z.array(
    z.object({
      confidence: z.number(),
      fromCache: z.boolean(),
      newName: z.string().optional(),
      sourceLabel: z.string(),
      suggestedInstitutionDomain: z.string().optional(),
      suggestedInstitutionName: z.string().optional(),
      suggestedSubtype: z.string().optional(),
      suggestedType: z.enum(["depository", "credit", "investment", "loan"]).optional(),
      target: z.string(),
    }),
  ),
});
export type AccountSuggestionsResponse = z.infer<typeof accountSuggestionsResponseSchema>;

/* ------------------------------------------------------------------ */
/* Step 4 — category mapping                                          */
/* ------------------------------------------------------------------ */

const categoryChoiceSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), targetCategoryId: z.string().uuid() }),
  z.object({ action: z.literal("skip") }),
]);
export type CategoryChoice = z.infer<typeof categoryChoiceSchema>;

export const confirmCategoryMappingBodySchema = z.object({
  map: z.record(z.string(), categoryChoiceSchema),
});
export type ConfirmCategoryMappingBody = z.infer<typeof confirmCategoryMappingBodySchema>;

export const categorySuggestionsResponseSchema = z.object({
  sourceLabels: z.array(z.string()),
  suggestions: z.array(
    z.object({
      action: z.enum(["link", "skip"]),
      confidence: z.number(),
      fromCache: z.boolean(),
      sourceLabel: z.string(),
      targetCategoryId: z.string().nullable(),
    }),
  ),
  userCategories: z.array(
    z.object({
      groupId: z.string(),
      iconKey: z.string(),
      id: z.string(),
      name: z.string(),
      systemKey: z.string().nullable(),
    }),
  ),
  userGroups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      systemKey: z.string().nullable(),
    }),
  ),
});
export type CategorySuggestionsResponse = z.infer<typeof categorySuggestionsResponseSchema>;

/* ------------------------------------------------------------------ */
/* Status / generic responses                                         */
/* ------------------------------------------------------------------ */

export const importJobStatusEnum = z.enum([
  "uploaded",
  "column_mapped",
  "account_mapped",
  "category_mapped",
  "committing",
  "committed",
  "failed",
  "cancelled",
]);

export const importStatusResponseSchema = z.object({
  errorMessage: z.string().nullable(),
  id: z.string().uuid(),
  originalFilename: z.string().nullable(),
  /** Live workflow progress; null until commit starts. */
  progress: z
    .object({
      done: z.number(),
      message: z.string().optional(),
      step: z.string(),
      total: z.number(),
    })
    .nullable(),
  rejectedRows: z.number().int().nonnegative(),
  source: z.literal("csv"),
  status: importJobStatusEnum,
  /** Terminal counts; null until committed/failed/cancelled. */
  summary: z
    .object({
      duplicates: z.number(),
      excluded: z.number(),
      failed: z.number(),
      imported: z.number(),
    })
    .nullable(),
  /** Counts derived from staged rows; only meaningful past `column_mapped`. */
  totalRows: z.number().int().nonnegative(),
});
export type ImportStatusResponse = z.infer<typeof importStatusResponseSchema>;

export const uploadResponseSchema = z.object({
  headers: z.array(z.string()),
  id: z.string().uuid(),
  sampleRows: z.array(z.record(z.string(), z.string())),
  totalRows: z.number().int().nonnegative(),
});

export const successResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean(),
});

/** Column-map confirm response — carries staged/rejected counts for the early-surface check. */
export const columnMappingConfirmResponseSchema = z.object({
  rejected: z.number().int().nonnegative(),
  staged: z.number().int().nonnegative(),
  success: z.boolean(),
});

/** Commit request body. `override` lets the user proceed past pre-commit warnings. */
export const commitBodySchema = z.object({
  override: z.boolean().optional(),
});
export type CommitBody = z.infer<typeof commitBodySchema>;

/** 422 payload when the pre-commit gate blocks or warns. */
export const preCommitGateResponseSchema = z.object({
  blocked: z.boolean(),
  reasons: z.array(z.string()),
  warnings: z.array(z.string()),
});

/** A few staged rows for the commit-screen sanity preview. */
export const stagedPreviewResponseSchema = z.object({
  rows: z.array(
    z.object({
      amount: z.string(),
      date: z.string(),
      merchant: z.string(),
      sourceAccountName: z.string(),
      sourceCategoryName: z.string().nullable(),
    }),
  ),
});

/** Confirmed account + category decisions for this import — seeds the expanded preview's pickers. */
export const importResolutionsResponseSchema = z.object({
  accountByLabel: z.record(z.string(), z.string()),
  categoryByLabel: z.record(z.string(), z.string()),
  pendingAccounts: z.array(
    z.object({
      institutionLogoDomain: z.string().nullable(),
      institutionName: z.string().nullable(),
      key: z.string(),
      name: z.string(),
      subtype: z.string(),
      type: z.string(),
    }),
  ),
  pendingCategories: z.array(
    z.object({
      color: z.string().nullable(),
      groupId: z.string(),
      iconKey: z.string(),
      name: z.string(),
      sourceLabel: z.string(),
    }),
  ),
  singleAccountId: z.string().nullable(),
});

/** Full staged-row set (incl. rejected) for the expanded mini-table view. */
export const stagedRowsResponseSchema = z.object({
  rows: z.array(
    z.object({
      amount: z.string(),
      date: z.string(),
      id: z.string().uuid(),
      merchant: z.string(),
      notes: z.string().nullable(),
      originalDescription: z.string().nullable(),
      parseError: z.string().nullable(),
      sourceAccountName: z.string(),
      sourceCategoryName: z.string().nullable(),
      tags: z.array(z.string()),
    }),
  ),
  /** True when the column mapping assigned a tags column — table shows Tags only then. */
  tagsMapped: z.boolean(),
});

export const updateStagedRowParamSchema = z.object({
  id: z.string().uuid(),
  rowId: z.string().uuid(),
});

/**
 * Editable subset of `import_staged_transaction`. Account + category are mapped
 * per-label upstream (Steps 3/4), not per-row, so they are not patchable here.
 * Amount validation mirrors the frontend regex; whitespace-only merchant rejected.
 */
export const updateStagedRowBodySchema = z
  .object({
    amount: z
      .string()
      .regex(/^-?\d+(\.\d+)?$/, "Amount must be a signed decimal")
      .optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be ISO yyyy-MM-dd")
      .optional(),
    merchant: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    originalDescription: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field required");
export type UpdateStagedRowBody = z.infer<typeof updateStagedRowBodySchema>;
