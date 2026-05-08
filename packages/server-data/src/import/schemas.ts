import { z } from "@hono/zod-openapi";

import type { ImportSource } from "./types";

const IMPORT_SOURCES = ["csv"] as const satisfies readonly ImportSource[];

/** Per-source-account mapping entry submitted from the mapping UI. */
export const accountMapEntrySchema = z.discriminatedUnion("kind", [
  /** Map source-account name onto an existing Cobalt `financial_account`. */
  z.object({
    accountId: z.string().uuid(),
    kind: z.literal("existing"),
  }),
  /** Create a new manual account on commit. Mirrors the SRI-315 createAccount mutator inputs. */
  z.object({
    kind: z.literal("create"),
    name: z.string().min(1).max(255),
    subtype: z.string().min(1).max(64),
    type: z.enum(["depository", "credit", "investment", "loan"]),
  }),
  /** Skip rows belonging to this source account on commit. */
  z.object({ kind: z.literal("skip") }),
]);
export type AccountMapEntry = z.infer<typeof accountMapEntrySchema>;

export const importJobIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const accountMapBodySchema = z.object({
  /** Keyed by `sourceAccountName` exactly as it appeared in the file. */
  mapping: z.record(z.string(), accountMapEntrySchema),
});
export type AccountMapBody = z.infer<typeof accountMapBodySchema>;

export const importStatusResponseSchema = z.object({
  /** Distinct source-account labels extracted from the file, for the mapping UI. */
  accounts: z.array(z.string()),
  /** Distinct source-category labels (Phase 1c will surface to category-mapping UI). */
  categories: z.array(z.string()),
  /** Resolved mapping (echoed back) once the user has submitted. */
  currentMapping: z.record(z.string(), accountMapEntrySchema).nullable(),
  /** Counts only meaningful in `mapped`/`committed`. */
  dupeCount: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
  id: z.string().uuid(),
  importCount: z.number().int().nonnegative(),
  source: z.enum(IMPORT_SOURCES),
  status: z.enum(["uploaded", "parsed", "mapped", "committed", "failed"]),
});
export type ImportStatusResponse = z.infer<typeof importStatusResponseSchema>;

export const uploadResponseSchema = z.object({
  accounts: z.array(z.string()),
  categories: z.array(z.string()),
  id: z.string().uuid(),
});

export const successResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean(),
});
