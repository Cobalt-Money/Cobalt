import Papa from "papaparse";

import type { ImportAdapter, StagedTransaction } from "../types";
import type { MintRawRow } from "./types";
import { MINT_HEADER_COLUMNS } from "./types";

/** Mint exports `MM/dd/yyyy`. Convert to ISO `yyyy-MM-dd`. */
function parseMintDate(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Unparseable Mint date: "${input}"`);
  }
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

/** Mint amounts are always positive; sign comes from `Transaction Type` (debit → negative). */
function signedAmount(rawAmount: string, txType: string): number {
  const cleaned = rawAmount.replaceAll(/[$,]/g, "").trim();
  const magnitude = Number.parseFloat(cleaned);
  if (!Number.isFinite(magnitude)) {
    throw new TypeError(`Unparseable Mint amount: "${rawAmount}"`);
  }
  const isDebit = txType.trim().toLowerCase() === "debit";
  return isDebit ? -Math.abs(magnitude) : Math.abs(magnitude);
}

/** Mint-categorized transfers come as paired (debit, credit) rows on opposite accounts. Tagged for downstream collapse. */
function isTransferCategory(category: string): boolean {
  const c = category.trim().toLowerCase();
  return c === "transfer" || c === "credit card payment";
}

/** Space-separated, but tag names may contain spaces. Treated as opaque single-token bag for now. */
function parseLabels(labels: string): string[] {
  const trimmed = labels.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Within-file transfer-pair dedupe.
 *
 * Mint exports both legs of a transfer as separate rows on each account. Cobalt models
 * a single transfer event, so we collapse the pair: keep the debit (outflow) leg and drop
 * the matching credit. Pairs match on (date, |amount|, transfer-category) within the file.
 *
 * Cross-file pairs (re-importing partial history) are caught later by the cross-row dedupe pass.
 */
function dedupeWithinFileTransferPairs(rows: StagedTransaction[]): StagedTransaction[] {
  const transferIndex = new Map<string, number[]>();
  for (const [idx, row] of rows.entries()) {
    if (!row.isTransfer) {
      continue;
    }
    const key = `${row.date}|${Math.abs(row.amount).toFixed(2)}`;
    const list = transferIndex.get(key);
    if (list) {
      list.push(idx);
    } else {
      transferIndex.set(key, [idx]);
    }
  }

  const dropIndices = new Set<number>();
  for (const indices of transferIndex.values()) {
    if (indices.length < 2) {
      continue;
    }
    const debits = indices.filter((i) => (rows[i]?.amount ?? 0) < 0);
    const credits = indices.filter((i) => (rows[i]?.amount ?? 0) > 0);
    const pairs = Math.min(debits.length, credits.length);
    for (let i = 0; i < pairs; i += 1) {
      const creditIdx = credits[i];
      if (creditIdx !== undefined) {
        dropIndices.add(creditIdx);
      }
    }
  }

  return rows.filter((_, idx) => !dropIndices.has(idx));
}

export const mintAdapter: ImportAdapter<MintRawRow> = {
  detect(sample) {
    const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
    return MINT_HEADER_COLUMNS.every(
      (col) => firstLine.includes(`"${col}"`) || firstLine.includes(col),
    );
  },

  extractAccounts(raw) {
    const set = new Set<string>();
    for (const row of raw) {
      const name = row["Account Name"]?.trim();
      if (name) {
        set.add(name);
      }
    }
    return [...set];
  },

  extractCategories(raw) {
    const set = new Set<string>();
    for (const row of raw) {
      const cat = row.Category?.trim();
      if (cat) {
        set.add(cat);
      }
    }
    return [...set];
  },

  normalize(raw) {
    const staged: StagedTransaction[] = [];
    for (const row of raw) {
      try {
        const transfer = isTransferCategory(row.Category);
        staged.push({
          amount: signedAmount(row.Amount, row["Transaction Type"]),
          date: parseMintDate(row.Date),
          externalId: null,
          isSplit: false,
          isTransfer: transfer,
          merchant: (row.Description || row["Original Description"] || "").trim(),
          notes: row.Notes?.trim() || null,
          originalDescription: row["Original Description"]?.trim() || null,
          rawBlob: row as unknown as Record<string, unknown>,
          sourceAccountName: row["Account Name"]?.trim() || "Unknown",
          sourceCategoryName: row.Category?.trim() || null,
          tags: parseLabels(row.Labels ?? ""),
        });
      } catch {
        // Row-level parse failures are surfaced by the pipeline via `import_staged_transaction.parseError`;
        // the adapter itself skips them so a single bad row doesn't poison the whole import.
        continue;
      }
    }
    return dedupeWithinFileTransferPairs(staged);
  },

  parse({ buffer }) {
    // Strip UTF-8 BOM (U+FEFF). Excel's "Save As CSV" prepends one; if it leaks
    // into the header row the first column key becomes "﻿Date" and every
    // row's date resolves to undefined → silent empty import.
    const raw = buffer.toString("utf-8");
    const text = raw.startsWith("﻿") ? raw.slice(1) : raw;
    const result = Papa.parse<MintRawRow>(text, {
      header: true,
      skipEmptyLines: true,
      // `Original Description` may contain newlines from raw bank feeds; quoted fields handle this in RFC 4180-conformant exports.
      // Mint exports are RFC 4180-quoted, so default papaparse handling is sufficient.
    });
    if (result.errors.length > 0) {
      const firstFatal = result.errors.find((e) => e.type !== "FieldMismatch");
      if (firstFatal) {
        throw new Error(`Mint CSV parse failed: ${firstFatal.message}`);
      }
    }
    return Promise.resolve(result.data);
  },

  source: "mint",
};
