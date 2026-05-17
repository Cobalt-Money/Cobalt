import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";

import type { StagedTransaction } from "../shared/types";

/**
 * Apply a confirmed `CsvMapping` to raw CSV rows and produce `StagedTransaction[]`.
 *
 * Per-row null policy (mirrors SRI-321 spec):
 *   - empty `date` or unparseable `amount`     → row.parseError set (commit skips)
 *   - empty `merchant`                         → row.parseError set (name is essential)
 *   - empty `account` (when account column mapped) → row.parseError set
 *   - empty `category` (when column mapped)    → null sourceCategoryName → uncategorized at commit
 *   - empty notes/tags                         → null / []
 *   - whitespace-only / "null|NULL|-|n/a|N/A"  → treated as empty
 */

const EMPTY_TOKENS = new Set(["", "null", "n/a"]);

/**
 * Strip characters that are dangerous or meaningless in a transaction field:
 *   - C0/C1 control chars incl. NUL — Postgres `text`/`jsonb` reject NUL bytes
 *     outright, so an unstripped cell would crash the commit insert.
 *   - bidi/format overrides (RTL-override etc.) — used for UI display spoofing.
 */
// Code-point ranges, in decimal (hex literals deadlock oxfmt vs the lint rule):
//   C0 controls 0–31, DEL+C1 127–159, ARABIC LETTER MARK 1564,
//   LRM/RLM 8206/8207, bidi embeddings/overrides 8234–8238, isolates 8294–8297.
const CONTROL_MAX = 31;
const C1_START = 127;
const C1_END = 159;
const ARABIC_LETTER_MARK = 1564;
const LRM = 8206;
const RLM = 8207;
const BIDI_EMBED_START = 8234;
const BIDI_EMBED_END = 8238;
const BIDI_ISOLATE_START = 8294;
const BIDI_ISOLATE_END = 8297;

function sanitizeCell(v: string): string {
  let out = "";
  for (const ch of v) {
    const c = ch.codePointAt(0) ?? 0;
    const isControl = c <= CONTROL_MAX || (c >= C1_START && c <= C1_END);
    const isBidi =
      c === ARABIC_LETTER_MARK ||
      c === LRM ||
      c === RLM ||
      (c >= BIDI_EMBED_START && c <= BIDI_EMBED_END) ||
      (c >= BIDI_ISOLATE_START && c <= BIDI_ISOLATE_END);
    if (!isControl && !isBidi) {
      out += ch;
    }
  }
  return out;
}

/** Sanitize every value in a raw CSV row before it touches the parser or the DB. */
function sanitizeRow(raw: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    clean[k] = typeof v === "string" ? sanitizeCell(v) : v;
  }
  return clean;
}

function isEmptyCell(v: string | undefined | null): boolean {
  if (v === undefined || v === null) {
    return true;
  }
  const trimmed = v.trim();
  if (trimmed.length === 0) {
    return true;
  }
  return EMPTY_TOKENS.has(trimmed.toLowerCase()) || trimmed === "-";
}

interface ParseRowsResult {
  staged: StagedTransaction[];
  /** Row indices the parser flagged with errors. Useful for the preview-screen failed-rows panel. */
  rejected: { row: number; reason: string; raw: Record<string, string> }[];
}

export function parseRows({
  rows,
  mapping,
  defaultAccountName,
  defaultDate,
}: {
  rows: Record<string, string>[];
  mapping: CsvMapping;
  /** When `mapping.account === null`, every row is tagged with this label so Step 3 (Path B) can resolve. */
  defaultAccountName: string;
  /** When `mapping.date.kind === "missing"`. */
  defaultDate?: string;
}): ParseRowsResult {
  const staged: StagedTransaction[] = [];
  const rejected: {
    row: number;
    reason: string;
    raw: Record<string, string>;
  }[] = [];

  for (const [idx, rawRow] of rows.entries()) {
    // Sanitize once up front so both the parsed fields and the stored `rawBlob`
    // are free of NUL/control/bidi chars.
    const raw = sanitizeRow(rawRow);
    try {
      staged.push(parseOne(raw, mapping, defaultAccountName, defaultDate));
    } catch (error) {
      rejected.push({
        raw,
        reason: error instanceof Error ? error.message : "Parse error",
        row: idx + 2, // +2: 1-based + header offset
      });
    }
  }

  return { rejected, staged };
}

function parseOne(
  raw: Record<string, string>,
  mapping: CsvMapping,
  defaultAccountName: string,
  defaultDate: string | undefined,
): StagedTransaction {
  const date = extractDate(raw, mapping, defaultDate);
  const amount = extractAmount(raw, mapping);
  const merchantCell = raw[mapping.merchant.column];
  if (isEmptyCell(merchantCell)) {
    throw new Error("Merchant cell empty");
  }
  const merchant = (merchantCell ?? "").trim();
  const sourceAccountName = mapping.account
    ? (raw[mapping.account.column] ?? "")
    : defaultAccountName;
  if (mapping.account && isEmptyCell(sourceAccountName)) {
    throw new Error("Account cell empty");
  }
  const sourceCategoryName = takeOptionalCell(raw, mapping.category?.column);
  const notes = takeOptionalCell(raw, mapping.notes?.column);
  const originalDescription = takeOptionalCell(raw, mapping.originalDescription?.column);
  const tags = mapping.tags ? splitTags(raw[mapping.tags.column], mapping.tags.delimiter) : [];
  const isTransfer = applyTransferRule(raw, mapping, sourceCategoryName, merchant);
  const excluded = applyExcludeRule(raw, mapping);

  return {
    amount,
    date,
    externalId: null,
    isSplit: false,
    isTransfer,
    merchant: merchant.trim(),
    notes: notes?.trim() || null,
    originalDescription: originalDescription?.trim() || null,
    rawBlob: { ...raw, _excluded: excluded },
    sourceAccountName: sourceAccountName.trim(),
    sourceCategoryName,
    tags,
  };
}

function takeOptionalCell(raw: Record<string, string>, column: string | undefined): string | null {
  if (!column) {
    return null;
  }
  if (isEmptyCell(raw[column])) {
    return null;
  }
  return (raw[column] ?? "").trim();
}

function extractDate(raw: Record<string, string>, mapping: CsvMapping, fallback?: string): string {
  if (mapping.date.kind === "missing") {
    if (!fallback) {
      throw new Error("Date column missing and no defaultDate provided");
    }
    return fallback;
  }
  const cell = raw[mapping.date.column];
  if (isEmptyCell(cell)) {
    throw new Error("Date cell empty");
  }
  return parseDate(cell as string, mapping.date.format);
}

/**
 * Minimal date parser — supports the common Luxon-style tokens we expect from
 * the AI: `yyyy-MM-dd`, `MM/dd/yyyy`, `dd/MM/yyyy`, `yyyy/MM/dd`. Anything
 * else falls back to `Date.parse`. Output is ISO yyyy-MM-dd.
 */
function parseDate(cell: string, format: string): string {
  const trimmed = cell.trim();
  const known: Record<string, RegExp> = {
    "M/d/yyyy": /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    "MM/dd/yyyy": /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    "dd/MM/yyyy": /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    "yyyy-MM-dd": /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    "yyyy/MM/dd": /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
  };
  const re = known[format];
  if (re) {
    const m = re.exec(trimmed);
    if (m && m[1] && m[2] && m[3]) {
      const [, p1, p2, p3] = m;
      let yyyy: string;
      let mm: string;
      let dd: string;
      if (format.startsWith("yyyy")) {
        yyyy = p1;
        mm = p2;
        dd = p3;
      } else if (format === "dd/MM/yyyy") {
        dd = p1;
        mm = p2;
        yyyy = p3;
      } else {
        mm = p1;
        dd = p2;
        yyyy = p3;
      }
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    throw new TypeError(`Unparseable date "${cell}"`);
  }
  return new Date(ms).toISOString().slice(0, 10);
}

// Cobalt convention (matches Plaid): positive = outflow/spending, negative = inflow/income.
// Source CSVs use varied conventions; normalize to Cobalt's here.
function extractAmount(raw: Record<string, string>, mapping: CsvMapping): number {
  const a = mapping.amount;
  if (a.kind === "signed") {
    const cell = raw[a.column];
    if (isEmptyCell(cell)) {
      throw new Error("Amount cell empty");
    }
    let n = parseAmount(cell as string, a.parensNegative);
    if (a.signConvention === "outflow_negative") {
      n = -n;
    }
    return n;
  }
  if (a.kind === "split") {
    const out = isEmptyCell(raw[a.outflowColumn])
      ? 0
      : parseAmount(raw[a.outflowColumn] as string, false);
    const inn = isEmptyCell(raw[a.inflowColumn])
      ? 0
      : parseAmount(raw[a.inflowColumn] as string, false);
    if (out === 0 && inn === 0) {
      throw new Error("Both outflow and inflow empty");
    }
    return Math.abs(out) - inn;
  }
  // magnitude_type
  const mag = raw[a.magnitudeColumn];
  if (isEmptyCell(mag)) {
    throw new Error("Amount cell empty");
  }
  const magnitude = Math.abs(parseAmount(mag as string, false));
  const typeCell = (raw[a.typeColumn] ?? "").trim().toLowerCase();
  const isDebit = a.debitValues.some((v) => v.toLowerCase() === typeCell);
  return isDebit ? magnitude : -magnitude;
}

function parseAmount(cell: string, parensNegative: boolean): number {
  let s = cell.trim().replaceAll(/[$,]/g, "");
  let neg = false;
  if (parensNegative && /^\(.+\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) {
    throw new TypeError(`Unparseable amount "${cell}"`);
  }
  return neg ? -n : n;
}

function splitTags(cell: string | undefined, delimiter: string): string[] {
  if (isEmptyCell(cell)) {
    return [];
  }
  return (cell ?? "")
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyTransferRule(
  raw: Record<string, string>,
  mapping: CsvMapping,
  sourceCategoryName: string | null,
  merchant: string,
): boolean {
  const rule = mapping.transferRule;
  if (!rule) {
    return false;
  }
  if (rule.kind === "category_match") {
    return sourceCategoryName !== null && rule.values.includes(sourceCategoryName);
  }
  if (rule.kind === "type_match") {
    const v = (raw[rule.column] ?? "").trim();
    return rule.values.includes(v);
  }
  return rule.prefixes.some((p) => merchant.toLowerCase().startsWith(p.toLowerCase()));
}

function applyExcludeRule(raw: Record<string, string>, mapping: CsvMapping): boolean {
  const rule = mapping.excludeRule;
  if (!rule) {
    return false;
  }
  const v = (raw[rule.column] ?? "").trim();
  return rule.trueValues.includes(v);
}
