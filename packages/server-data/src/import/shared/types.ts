/**
 * Import-pipeline shared types (SRI-321).
 *
 * The AI-mapped generic CSV adapter is the only adapter; per-vendor adapters
 * were removed in favor of header-name + LLM column mapping. `StagedTransaction`
 * is what `parseRows` produces from a confirmed `CsvMapping`, written to
 * `import_staged_transaction` and consumed by the commit workflow.
 */

export type ImportSource = "csv";

export interface StagedTransaction {
  /** Signed amount in Cobalt convention (matches Plaid): positive = outflow, negative = inflow. */
  amount: number;
  /** ISO date (yyyy-MM-dd). */
  date: string;
  /** Provider stable id when available; null for AI-mapped CSV. */
  externalId: string | null;
  isSplit: boolean;
  isTransfer: boolean;
  merchant: string;
  notes: string | null;
  originalDescription: string | null;
  /** Untouched parsed row from the source file; preserved for the failed-rows panel. */
  rawBlob: Record<string, unknown>;
  sourceAccountName: string;
  sourceCategoryName: string | null;
  tags: string[];
}
