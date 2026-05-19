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
  | "DUPLICATE_HEADERS"
  | "DUPLICATE_FILE";

/** U+FEFF byte-order mark, in decimal (hex literals deadlock oxfmt vs the lint rule). */
const BOM_CODE_POINT = 65_279;

/** Strip a leading UTF-8/UTF-16 BOM so it doesn't glue onto the first header cell. */
function stripBom(text: string): string {
  return text.codePointAt(0) === BOM_CODE_POINT ? text.slice(1) : text;
}

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
function decode(buffer: Buffer): {
  encoding: "utf-8" | "utf-16le" | "latin1";
  text: string;
} {
  const candidates: ("utf-8" | "utf-16le" | "latin1")[] = ["utf-8", "utf-16le", "latin1"];
  let best: {
    encoding: (typeof candidates)[number];
    text: string;
    bad: number;
  } | null = null;
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

const DRIFT_SAMPLE_ROWS = 50;
const PREVIEW_SAMPLE_ROWS = 20;

function isBlankRow(row: string[]): boolean {
  return !row.some((v) => ((v ?? "") as string).trim() !== "");
}

/**
 * Parse + validate row/col sanity. Returns headers + capped sample.
 *
 * Streams via Papa's `step` callback so the full row set is never buffered in
 * memory — only the header, a column-usage bitmap, drift counters, a 20-row
 * preview, and a running count are retained. Bounds heap use under concurrent
 * uploads on serverless.
 */
function parseAndValidate(text: string): ParsedSample {
  // Object holder so TS keeps the union type through the closure-mutated assignment.
  const state: {
    header: string[] | null;
    dataRowCount: number;
    driftSeen: number;
    driftBad: number;
  } = { dataRowCount: 0, driftBad: 0, driftSeen: 0, header: null };
  const colHasData: boolean[] = [];
  const sampleRaw: string[][] = [];

  Papa.parse<string[]>(text, {
    delimiter: ",",
    skipEmptyLines: "greedy",
    step: (res) => {
      const row = res.data;
      // `skipEmptyLines: greedy` misses rows of only-whitespace cells — drop those too.
      if (!Array.isArray(row) || isBlankRow(row)) {
        return;
      }
      // row is a non-blank string[] past this point
      const currentHeader = state.header;
      if (currentHeader === null) {
        state.header = row.map((h) => (h ?? "").trim());
        return;
      }
      state.dataRowCount += 1;
      for (let i = 0; i < currentHeader.length; i += 1) {
        if (((row[i] ?? "") as string).trim() !== "") {
          colHasData[i] = true;
        }
      }
      if (state.driftSeen < DRIFT_SAMPLE_ROWS) {
        state.driftSeen += 1;
        if (Math.abs(row.length - currentHeader.length) > 1) {
          state.driftBad += 1;
        }
      }
      if (sampleRaw.length < PREVIEW_SAMPLE_ROWS) {
        sampleRaw.push(row);
      }
    },
  });

  const { dataRowCount, driftBad, driftSeen } = state;
  if (state.header === null) {
    throw new ImportGateError("ROW_COUNT", "File needs at least a header row and one data row.");
  }
  if (dataRowCount < 1) {
    throw new ImportGateError("ROW_COUNT", "File needs at least a header row and one data row.");
  }
  if (dataRowCount > MAX_ROWS) {
    throw new ImportGateError("ROW_COUNT", `File exceeds ${String(MAX_ROWS)} data-row limit.`);
  }
  const { header } = state;
  if (header.filter((h) => h.length > 0).length < 3) {
    throw new ImportGateError("HEADER_SANITY", "Header row needs at least 3 named columns.");
  }
  if (header.every((h) => /^[\d\s.,-]*$/.test(h))) {
    throw new ImportGateError(
      "HEADER_SANITY",
      "Header row looks numeric — headerless files unsupported.",
    );
  }
  if (driftBad / Math.max(driftSeen, 1) > 0.3) {
    throw new ImportGateError("COL_COUNT", "Column count varies wildly across rows.");
  }
  // Prune columns that are blank-named OR entirely empty across all data rows — they
  // carry no mappable signal. Must stay aligned with `parseFullCsv` (which keys by
  // header name, so pruned columns simply never get referenced by the mapping).
  const keepIndices = header
    .map((_, i) => i)
    .filter((i) => (header[i] ?? "").length > 0 && colHasData[i] === true);
  const headerRow = keepIndices.map((i) => header[i] ?? "");
  if (headerRow.length < 3) {
    throw new ImportGateError("HEADER_SANITY", "Header row needs at least 3 named columns.");
  }
  // Duplicate headers silently drop data (last column wins) — hard-stop instead.
  const seen = new Set<string>();
  for (const h of headerRow) {
    const key = h.toLowerCase();
    if (seen.has(key)) {
      throw new ImportGateError(
        "DUPLICATE_HEADERS",
        `Duplicate column header "${h}". Rename or remove the duplicate and re-upload.`,
      );
    }
    seen.add(key);
  }
  const rows: Record<string, string>[] = sampleRaw.map((r) => {
    const row: Record<string, string> = {};
    for (const [col, i] of keepIndices.entries()) {
      const key = headerRow[col] ?? `col_${String(col)}`;
      row[key] = (r[i] ?? "").toString();
    }
    return row;
  });
  return { headers: headerRow, rows, totalRows: dataRowCount };
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
  const { encoding, text: decoded } = decode(buffer);
  const text = stripBom(decoded);
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
