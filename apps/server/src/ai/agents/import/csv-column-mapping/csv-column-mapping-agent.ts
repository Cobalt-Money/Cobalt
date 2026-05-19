import { env } from "@cobalt-web/env/server";
import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";
import { Output, generateText } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";

import { gatewayModel } from "../../../model-provider.js";

const PRIMARY = "anthropic/claude-opus-4.7";
const FALLBACK = "anthropic/claude-opus-4.7";

const csvMappingAiSchema = z.object({
  /**
   * Escape hatch for files that don't look like a transactions export
   * (newsletters, schedules, etc).
   */
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
  excludeRule: z
    .object({
      column: z.string(),
      trueValues: z.array(z.string()),
    })
    .nullable(),
  merchant: z.object({ column: z.string() }),
  notTransactionData: z.boolean().optional(),
  notes: z.object({ column: z.string() }).nullable(),
  originalDescription: z.object({ column: z.string() }).nullable(),
  tags: z
    .object({
      column: z.string(),
      delimiter: z.string(),
    })
    .nullable(),
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

export type CsvMappingAi = z.infer<typeof csvMappingAiSchema>;

/**
 * Infer column → field mapping for a CSV from headers + sample rows.
 * Pure agent: one Opus call + Opus retry on parse failure, zod-validated.
 * Caller owns cache lookup/persist.
 */
export async function runCsvColumnMappingAgent({
  headers,
  rows,
  model,
}: {
  headers: string[];
  rows: Record<string, string>[];
  /** Override model. Defaults to gateway primary/fallback pair. Used by tests. */
  model?: LanguageModel;
}): Promise<CsvMapping> {
  if (headers.length === 0) {
    throw new Error("CSV has no headers.");
  }
  if (!model && !env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  const samples = pickStratifiedSamples(rows);
  const typeHint = detectTypeColumnHint(headers, rows);
  const prompt = buildPrompt(headers, samples, typeHint);

  const tryOnce = (m: LanguageModel) =>
    generateText({
      experimental_telemetry: {
        functionId: "csv-column-mapping-agent",
        isEnabled: true,
      },
      model: m,
      output: Output.object({ schema: csvMappingAiSchema }),
      prompt,
    });

  let result;
  if (model) {
    result = await tryOnce(model);
  } else {
    try {
      result = await tryOnce(gatewayModel(PRIMARY));
    } catch {
      result = await tryOnce(gatewayModel(FALLBACK));
    }
  }

  const ai = result.output;
  if (typeHint && ai.amount.kind !== "magnitude_type") {
    ai.amount = {
      debitValues: typeHint.debitValues,
      kind: "magnitude_type",
      magnitudeColumn: typeHint.amountColumn,
      typeColumn: typeHint.typeColumn,
    };
  }
  if (ai.notTransactionData) {
    throw new Error("File does not look like a transactions export.");
  }
  if (ai.confidence < 0.6) {
    throw new Error("Could not infer column mapping with high enough confidence.");
  }
  const headerSet = new Set(headers.map((h) => h.toLowerCase()));
  for (const col of collectClaimedColumns(ai)) {
    if (!headerSet.has(col.toLowerCase())) {
      throw new Error(`AI returned unknown column "${col}".`);
    }
  }
  // Strip the AI-only escape-hatch flag — never round-trips through DB.
  const { notTransactionData: _, ...rest } = ai;
  void _;
  return rest;
}

function pickStratifiedSamples(rows: Record<string, string>[]): Record<string, string>[] {
  if (rows.length <= 5) {
    return rows;
  }
  const head = rows.slice(0, 3);
  const ranked = [...rows]
    .map((r) => ({ len: Object.values(r).join("").length, row: r }))
    .toSorted((a, b) => b.len - a.len)
    .slice(0, 2)
    .map((r) => r.row);
  return [...head, ...ranked];
}

function collectClaimedColumns(ai: CsvMappingAi): string[] {
  const cols: string[] = [];
  if (ai.date.kind === "column") {
    cols.push(ai.date.column);
  }
  const { amount } = ai;
  if (amount.kind === "signed") {
    cols.push(amount.column);
  } else if (amount.kind === "split") {
    cols.push(amount.outflowColumn, amount.inflowColumn);
  } else {
    cols.push(amount.magnitudeColumn, amount.typeColumn);
  }
  cols.push(ai.merchant.column);
  if (ai.account) {
    cols.push(ai.account.column);
  }
  if (ai.category) {
    cols.push(ai.category.column);
  }
  if (ai.notes) {
    cols.push(ai.notes.column);
  }
  if (ai.originalDescription) {
    cols.push(ai.originalDescription.column);
  }
  if (ai.tags) {
    cols.push(ai.tags.column);
  }
  return cols;
}

interface TypeColumnHint {
  amountColumn: string;
  debitValues: string[];
  typeColumn: string;
}

const TYPE_HEADER_PATTERNS = [
  /^type$/,
  /transaction\s*type/,
  /tx\s*type/,
  /txn\s*type/,
  /trans\s*type/,
  /dr\s*\/?\s*cr/,
  /cr\s*\/?\s*dr/,
  /d\s*\/?\s*c/,
  /debit\s*\/?\s*credit/,
  /credit\s*\/?\s*debit/,
  /direction/,
  /money\s*(in\s*\/?\s*out|out\s*\/?\s*in)/,
  /in\s*\/?\s*out/,
  /flow/,
  /is\s*_?debit/,
  /^sign$/,
];

const DEBIT_VALUE_TOKENS = new Set([
  "debit",
  "dr",
  "withdrawal",
  "withdraw",
  "purchase",
  "sale",
  "out",
  "outflow",
  "spend",
]);

const INFLOW_VALUE_TOKENS = new Set([
  "credit",
  "cr",
  "deposit",
  "refund",
  "return",
  "in",
  "inflow",
  "income",
]);

function normalizeHeader(h: string): string {
  return h.toLowerCase().replaceAll(/["'`]/g, "").trim();
}

function isNumericLike(s: string): boolean {
  return /^-?\$?\(?-?\$?\s*-?\d[\d,]*(\.\d+)?\)?$/.test(s.trim());
}

function detectTypeColumnHint(
  headers: string[],
  rows: Record<string, string>[],
): TypeColumnHint | null {
  if (rows.length === 0) {
    return null;
  }

  const amountCandidates = headers.filter((h) => {
    const norm = normalizeHeader(h);
    if (
      !/amount|amt|value|total|sum/.test(norm) &&
      !/(out|with)flow|withdraw|deposit|debit|credit/.test(norm)
    ) {
      return false;
    }
    const vals = rows.map((r) => r[h] ?? "").filter((v) => v !== "");
    if (vals.length === 0) {
      return false;
    }
    if (!vals.every((v) => isNumericLike(v))) {
      return false;
    }
    // Skip if any sample is already signed — the sign lives in the amount column,
    // so this is kind=signed, not magnitude_type.
    if (vals.some((v) => /^[-(]/.test(v.trim()) || /-\d/.test(v.trim()))) {
      return false;
    }
    return true;
  });
  if (amountCandidates.length === 0) {
    return null;
  }
  const amountColumn =
    amountCandidates.find((h) => /^(amount|amt|value)/.test(normalizeHeader(h))) ??
    amountCandidates[0];
  if (!amountColumn) {
    return null;
  }

  for (const h of headers) {
    if (h === amountColumn) {
      continue;
    }
    const debitValues = detectDebitValuesForColumn(h, rows);
    if (debitValues) {
      return { amountColumn, debitValues, typeColumn: h };
    }
  }
  return null;
}

function detectDebitValuesForColumn(h: string, rows: Record<string, string>[]): string[] | null {
  const norm = normalizeHeader(h);
  const headerMatches = TYPE_HEADER_PATTERNS.some((p) => p.test(norm));

  const vals = rows.map((r) => (r[h] ?? "").trim()).filter((v) => v !== "");
  if (vals.length === 0) {
    return null;
  }
  // Don't treat a numeric column (e.g. another amount column in split-style CSVs) as a type column.
  if (vals.every((v) => isNumericLike(v)) && !/^is.?debit$|^sign$/.test(norm)) {
    return null;
  }
  const distinct = new Set(vals.map((v) => v.toLowerCase()));
  if (distinct.size > 6) {
    return null;
  }
  const lower = [...distinct];
  const hasDebit = lower.some((v) => DEBIT_VALUE_TOKENS.has(v));
  const hasInflow = lower.some((v) => INFLOW_VALUE_TOKENS.has(v));
  const isPlusMinus = distinct.size <= 2 && lower.every((v) => v === "+" || v === "-");
  const isBinary =
    headerMatches && distinct.size <= 2 && lower.every((v) => v === "0" || v === "1");

  const valuesMatch = (hasDebit && hasInflow) || isPlusMinus || isBinary;
  if (!headerMatches && !valuesMatch) {
    return null;
  }

  const debitValues: string[] = [];
  if (isPlusMinus) {
    debitValues.push("+");
  } else if (isBinary) {
    debitValues.push("1");
  } else {
    for (const v of lower) {
      if (DEBIT_VALUE_TOKENS.has(v)) {
        debitValues.push(v);
      }
    }
  }
  return debitValues.length > 0 ? debitValues : null;
}

function buildPrompt(
  headers: string[],
  samples: Record<string, string>[],
  typeHint: TypeColumnHint | null,
): string {
  const hintLines = typeHint
    ? [
        "",
        "=== DETERMINISTIC PRE-PASS RESULT (authoritative — DO NOT OVERRIDE) ===",
        `A type-indicator column was detected. You MUST return amount.kind="magnitude_type" with:`,
        `  typeColumn=${JSON.stringify(typeHint.typeColumn)}`,
        `  magnitudeColumn=${JSON.stringify(typeHint.amountColumn)}`,
        `  debitValues=${JSON.stringify(typeHint.debitValues)}`,
        "Do not pick 'signed' or 'split' for this file. The pre-pass already verified the amount column is unsigned and the type column has the right shape.",
        "",
      ]
    : [];
  return [
    "You are mapping CSV columns from a personal-finance export to Cobalt's transaction fields.",
    "Return a JSON object matching the schema. Required fields: date, amount, merchant.",
    "Optional: account, category, notes, originalDescription, tags, transferRule, excludeRule.",
    ...hintLines,
    "=== AMOUNT KIND — DECIDE THIS FIRST, BEFORE LOOKING AT ANYTHING ELSE ===",
    "Pick exactly one of three shapes by walking these checks in order. STOP at the first match.",
    "",
    "CHECK 1 — magnitude_type (single amount column + a separate direction/type column).",
    "  Scan EVERY non-amount column. Trigger magnitude_type if ANY of these are true for any column:",
    "    a) Header matches (case-insensitive, ignore punctuation): 'type', 'transaction type', 'tx type',",
    "       'txn type', 'trans type', 'dr/cr', 'd/c', 'debit/credit', 'cr/db', 'direction',",
    "       'money in/out', 'in/out', 'flow', 'isdebit', 'is_debit', 'sign'.",
    "    b) Column's sample values are drawn from a small set (≤6 distinct) AND at least one value matches",
    "       (case-insensitive): debit, credit, dr, cr, withdrawal, deposit, purchase, payment, return, refund,",
    "       sale, transfer, out, in, +, -, 1, 0.",
    "  If triggered: kind='magnitude_type'. typeColumn = that header. magnitudeColumn = the amount column.",
    "  debitValues = lowercase list of all values in that column that mean OUTFLOW (money leaving user).",
    "    Outflow synonyms: debit, dr, withdrawal, purchase, sale, out, payment(on cards: outflow), -, +(if + means debit), 1(if 1=debit).",
    "    Inflow synonyms (DO NOT include): credit, cr, deposit, refund, return, in.",
    "  THE AMOUNT COLUMN MAY CONTAIN ONLY POSITIVE NUMBERS — THIS IS EXPECTED. Do NOT fall through to 'signed' just because amounts look unsigned. The whole point of magnitude_type is that the sign lives in the type column.",
    "",
    "  Worked examples (all → magnitude_type):",
    '    Headers ["Date","Description","Amount","Transaction Type"], rows show Amount="5.75" Type="debit", Amount="2500.00" Type="credit"',
    '      → typeColumn="Transaction Type", magnitudeColumn="Amount", debitValues=["debit"]',
    '    Headers ["Date","Memo","Value","D/C"], rows show Value="5.75" D/C="+", Value="20.00" D/C="-"',
    '      → typeColumn="D/C", magnitudeColumn="Value", debitValues=["+"] (if + rows are spending)',
    '    Headers ["dt","amt","desc","txn_type"], rows show amt="5.75" txn_type="DR", amt="2500" txn_type="CR"',
    '      → typeColumn="txn_type", magnitudeColumn="amt", debitValues=["dr"]',
    '    Headers ["Date","Desc","Amount","Money In/Out"], rows show "120.50"/"Out", "3000"/"In"',
    '      → typeColumn="Money In/Out", magnitudeColumn="Amount", debitValues=["out"]',
    '    Headers ["Date","Desc","Amount","IsDebit"], rows show "5.75"/"1", "20"/"0"',
    '      → typeColumn="IsDebit", magnitudeColumn="Amount", debitValues=["1"]',
    "",
    "CHECK 2 — split (outflows and inflows in two separate amount columns).",
    "  Trigger when you see a PAIR of numeric columns like Debit/Credit, Outflow/Inflow, Withdrawal/Deposit, 'Money Out'/'Money In', where each row populates exactly one. Use kind='split'.",
    "",
    "CHECK 3 — signed (single amount column that itself carries the sign).",
    "  Only use this when NEITHER check 1 nor check 2 matched. Pick signConvention by inspecting samples:",
    "  if any sample amount has '-' or parens use 'outflow_negative'; otherwise 'outflow_positive'.",
    "  Set parensNegative=true if any sample uses '(123.45)' style.",
    "",
    "=== OTHER FIELDS ===",
    "ACCOUNT COLUMN: any header that identifies which financial account a row belongs to qualifies. Common header synonyms include 'Account', 'Account Name', 'Card', 'Card Name', 'Bank', 'Source', 'Institution', 'Wallet', 'Source Account', 'From Account'. Confirm by inspecting the column's sample values — it should contain a small set of repeating human-readable labels (e.g. 'Chase Checking', 'Amex Gold'), NOT free-form text, dates, amounts, or merchant names. If no column matches this shape, set account=null.",
    "Set notTransactionData=true if this looks like anything other than a list of bank transactions.",
    "",
    `Headers: ${JSON.stringify(headers)}`,
    `Sample rows: ${JSON.stringify(samples)}`,
    "",
    "Use the exact header strings as `column` values. For `date.format` use a Luxon format token (e.g. yyyy-MM-dd, MM/dd/yyyy).",
  ].join("\n");
}
