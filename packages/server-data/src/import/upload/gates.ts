import { createHash } from "node:crypto";

import Papa from "papaparse";

/**
 * Step 1 — structural gates. Reject obviously-wrong files at the boundary so AI
 * inference (Step 2) only runs on plausible tabular CSV input.
 *
 * Throws `ImportGateError` with a stable `code` for every rejection — the API
 * surface maps codes to user-facing messages.
 */

export type ImportGateCode =
  | "EXTENSION"
  | "MAGIC_BYTES"
  | "ENCODING"
  | "DELIMITER"
  | "SIZE"
  | "ROW_COUNT"
  | "COL_COUNT"
  | "HEADER_SANITY"
  | "DUPLICATE_FILE";

export class ImportGateError extends Error {
  readonly code: ImportGateCode;
  constructor(code: ImportGateCode, message: string) {
    super(message);
    this.name = "ImportGateError";
    this.code = code;
  }
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_ROWS = 500_000;

/** Magic-byte prefixes for binary formats we want to reject early. */
const BINARY_SIGNATURES: { bytes: number[]; label: string }[] = [
  { bytes: [80, 75, 3, 4], label: "xlsx" }, // PK + headers
  { bytes: [208, 207, 17, 224], label: "xls" }, // CFB
  { bytes: [37, 80, 68, 70], label: "pdf" }, // %PDF
];

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function startsWith(buffer: Buffer, sig: number[]): boolean {
  if (buffer.length < sig.length) {
    return false;
  }
  for (let i = 0; i < sig.length; i += 1) {
    if (buffer[i] !== sig[i]) {
      return false;
    }
  }
  return true;
}

function detectMagic(buffer: Buffer): { binary: false } | { binary: true; label: string } {
  for (const { bytes, label } of BINARY_SIGNATURES) {
    if (startsWith(buffer, bytes)) {
      return { binary: true, label };
    }
  }
  return { binary: false };
}

/**
 * Decode bytes to text. Try UTF-8, then UTF-16-LE, then latin1. Reject if no
 * encoding produces clean output (replacement chars >1% of stream).
 */
function decode(buffer: Buffer): { encoding: "utf-8" | "utf-16le" | "latin1"; text: string } {
  const candidates: ("utf-8" | "utf-16le" | "latin1")[] = ["utf-8", "utf-16le", "latin1"];
  let best: { encoding: (typeof candidates)[number]; text: string; bad: number } | null = null;
  for (const encoding of candidates) {
    const text = buffer.toString(encoding);
    const bad = (text.match(/�/g)?.length ?? 0) / Math.max(text.length, 1);
    if (bad < 0.01) {
      return { encoding, text };
    }
    if (!best || bad < best.bad) {
      best = { bad, encoding, text };
    }
  }
  if (!best) {
    throw new ImportGateError("ENCODING", "Could not decode file as text.");
  }
  if (best.bad >= 0.01) {
    throw new ImportGateError(
      "ENCODING",
      "File appears to be binary or use an unsupported encoding.",
    );
  }
  return { encoding: best.encoding, text: best.text };
}

/**
 * Sniff the first ~5 lines for delimiter. Reject anything other than comma:
 * tab and semicolon files are out of scope for MVP (separate ticket).
 */
function checkDelimiter(text: string): void {
  const head = text.slice(0, 4096);
  const lines = head.split(/\r?\n/).filter(Boolean).slice(0, 5);
  if (lines.length === 0) {
    throw new ImportGateError("ROW_COUNT", "File is empty.");
  }
  // Papa picks one if you don't specify; we want to assert comma is the dominant separator.
  const commaCounts = lines.map((l) => l.match(/,/g)?.length ?? 0);
  const semiCounts = lines.map((l) => l.match(/;/g)?.length ?? 0);
  const tabCounts = lines.map((l) => l.match(/\t/g)?.length ?? 0);
  const cs = sum(commaCounts);
  if (cs === 0 && (sum(semiCounts) > 0 || sum(tabCounts) > 0)) {
    throw new ImportGateError(
      "DELIMITER",
      "File is not comma-separated. Re-export as CSV with commas.",
    );
  }
}

export interface ParsedSample {
  /** Header row, trimmed. */
  headers: string[];
  /** First N rows (capped). Indexed by header. */
  rows: Record<string, string>[];
  /** All-rows count (post-trim, ignoring blank trailing lines). */
  totalRows: number;
}

/** Parse + validate row/col sanity. Returns headers + capped sample. */
function parseAndValidate(text: string): ParsedSample {
  const result = Papa.parse<string[]>(text, {
    delimiter: ",",
    skipEmptyLines: "greedy",
  });
  if (result.errors.length > 0 && result.errors[0]?.code === "TooFewFields") {
    // Tolerate ragged trailing rows; only fail on hard parser errors.
  }
  const data = result.data.filter(
    (r) => Array.isArray(r) && r.some((v) => (v ?? "").trim() !== ""),
  );
  if (data.length < 2) {
    throw new ImportGateError("ROW_COUNT", "File needs at least a header row and one data row.");
  }
  if (data.length - 1 > MAX_ROWS) {
    throw new ImportGateError("ROW_COUNT", `File exceeds ${String(MAX_ROWS)} data-row limit.`);
  }
  const headerRow = (data[0] ?? []).map((h) => (h ?? "").trim());
  if (headerRow.filter((h) => h.length > 0).length < 3) {
    throw new ImportGateError("HEADER_SANITY", "Header row needs at least 3 named columns.");
  }
  if (headerRow.every((h) => /^[\d\s.,-]*$/.test(h))) {
    throw new ImportGateError(
      "HEADER_SANITY",
      "Header row looks numeric — headerless files unsupported.",
    );
  }
  const dataRows = data.slice(1);
  // Column-count drift check across first 50 rows.
  const colCounts = dataRows.slice(0, 50).map((r) => r.length);
  const expected = headerRow.length;
  const driftRatio =
    colCounts.filter((c) => Math.abs(c - expected) > 1).length / Math.max(colCounts.length, 1);
  if (driftRatio > 0.3) {
    throw new ImportGateError("COL_COUNT", "Column count varies wildly across rows.");
  }
  const rows: Record<string, string>[] = dataRows.slice(0, 20).map((r) => {
    const row: Record<string, string> = {};
    for (let i = 0; i < headerRow.length; i += 1) {
      const key = headerRow[i] ?? `col_${String(i)}`;
      row[key] = (r[i] ?? "").toString();
    }
    return row;
  });
  return { headers: headerRow, rows, totalRows: dataRows.length };
}

export function hashFileBytes(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export interface GateResult extends ParsedSample {
  encoding: "utf-8" | "utf-16le" | "latin1";
  fileHash: string;
}

/**
 * Run all structural gates. Returns the parsed sample + hash on success;
 * throws `ImportGateError` on any failure. No AI calls, no DB writes.
 */
export function runGates(buffer: Buffer, filename: string): GateResult {
  if (!filename.toLowerCase().endsWith(".csv")) {
    throw new ImportGateError("EXTENSION", "Only .csv files are supported.");
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ImportGateError(
      "SIZE",
      `File exceeds ${String(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.`,
    );
  }
  const magic = detectMagic(buffer);
  if (magic.binary) {
    throw new ImportGateError("MAGIC_BYTES", `File looks like a ${magic.label} file, not CSV.`);
  }
  const { encoding, text } = decode(buffer);
  checkDelimiter(text);
  const sample = parseAndValidate(text);
  const fileHash = hashFileBytes(buffer);
  return { ...sample, encoding, fileHash };
}

/** sha256 of normalized header signature; key for `csv_mapping_cache`. */
export function headerSignature(headers: string[]): string {
  const normalized = [...headers]
    .map((h) => h.trim().toLowerCase())
    .toSorted()
    .join("|");
  return createHash("sha256").update(normalized).digest("hex");
}
