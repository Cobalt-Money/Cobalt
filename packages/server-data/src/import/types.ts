/**
 * Import-pipeline shared types (SRI-317).
 *
 * The pipeline normalizes every supported source (Mint CSV, future YNAB/Monarch/Copilot/OFX)
 * into one staged shape so all downstream stages — staging, account-mapping, dedupe, commit —
 * are provider-agnostic. Each source ships an `ImportAdapter` that owns its file format quirks
 * (sign carriers, milliunit conversions, transfer-pair collapsing) and produces `StagedTransaction`s.
 */

export type ImportSource = "mint";

/** Provider-agnostic shape written to `import_staged_transaction`. */
export interface StagedTransaction {
  /** Signed amount in Cobalt convention: negative = outflow, positive = inflow. */
  amount: number;
  /** ISO date (yyyy-MM-dd). */
  date: string;
  /** Provider stable id when available (YNAB UUID, OFX FITID); null for Mint/Monarch/Copilot CSV. */
  externalId: string | null;
  isSplit: boolean;
  isTransfer: boolean;
  merchant: string;
  notes: string | null;
  originalDescription: string | null;
  /** Untouched original row from the source file; preserved for adapter-bug debugging. */
  rawBlob: Record<string, unknown>;
  sourceAccountName: string;
  sourceCategoryName: string | null;
  tags: string[];
}

export interface ParseInput {
  /** Raw file bytes; adapter decodes (UTF-8 for CSV, binary for OFX). */
  buffer: Buffer;
  /** Original filename — adapters may inspect extension as a tiebreaker. */
  filename: string;
}

export interface AdapterContext {
  /** Owning user; not used for normalize today but reserved for per-user heuristics (currency, locale). */
  userId: string;
}

export interface ImportAdapter<TRaw = unknown> {
  /** Discriminator written to `import_job.source`. */
  readonly source: ImportSource;
  /** Cheap header sniff — receives ~first 5 rows of the file as a string. Order-independent across adapters. */
  detect(sample: string): boolean;
  /** Decode the file into adapter-specific raw rows. No business logic. */
  parse(input: ParseInput): Promise<TRaw[]>;
  /** Provider quirks → `StagedTransaction[]`: sign flipping, transfer-pair collapsing, split reconstruction. */
  normalize(raw: TRaw[], ctx: AdapterContext): StagedTransaction[];
  /** Distinct source-account labels for the mapping UI. */
  extractAccounts(raw: TRaw[]): string[];
  /** Distinct source-category labels for the (Phase 1c) category-mapping UI. Mint returns []; subcategory-only export. */
  extractCategories(raw: TRaw[]): string[];
}
