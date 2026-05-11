import { env } from "@cobalt-web/env/server";
import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";
import { generateObject } from "ai";
import { z } from "zod";

import { gatewayModel } from "../../model-provider.js";

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
 * Pure agent: one Haiku call + Sonnet fallback on parse failure, zod-validated.
 * Caller owns cache lookup/persist.
 */
export async function runCsvColumnMappingAgent({
  headers,
  rows,
}: {
  headers: string[];
  rows: Record<string, string>[];
}): Promise<CsvMapping> {
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  const samples = pickStratifiedSamples(rows);
  const prompt = buildPrompt(headers, samples);

  const tryOnce = (model: string) =>
    generateObject({
      experimental_telemetry: {
        functionId: "csv-column-mapping-agent",
        isEnabled: true,
      },
      model: gatewayModel(model),
      prompt,
      schema: csvMappingAiSchema,
    });

  let result;
  try {
    result = await tryOnce(PRIMARY);
  } catch {
    result = await tryOnce(FALLBACK);
  }

  const ai = result.object;
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

function buildPrompt(headers: string[], samples: Record<string, string>[]): string {
  return [
    "You are mapping CSV columns from a personal-finance export to Cobalt's transaction fields.",
    "Return a JSON object matching the schema. Required fields: date, amount, merchant.",
    "Optional: account, category, notes, originalDescription, tags, transferRule, excludeRule.",
    "Set notTransactionData=true if this looks like anything other than a list of bank transactions.",
    "",
    `Headers: ${JSON.stringify(headers)}`,
    `Sample rows: ${JSON.stringify(samples)}`,
    "",
    "Use the exact header strings as `column` values. For `date.format` use a Luxon format token (e.g. yyyy-MM-dd, MM/dd/yyyy).",
    "AMOUNT KIND SELECTION RULES (apply in order):",
    "  1. If you see ANY column whose header or sample values look like a debit/credit indicator (header named 'Transaction Type', 'Type', 'Tx Type', 'DR/CR', 'Debit/Credit', 'Direction', or values like 'debit'/'credit'/'DR'/'CR'/'withdrawal'/'deposit'/'+/-'), YOU MUST use kind=magnitude_type. Set typeColumn to that header, magnitudeColumn to the amount column, and debitValues to the lowercase strings that mean outflow (e.g. ['debit','dr','withdrawal']). The sample amount values will be unsigned/positive in this case — do NOT use kind=signed even if amounts look unsigned.",
    "  2. Else if outflows and inflows are in two SEPARATE columns (e.g. 'Debit' and 'Credit', 'Withdrawal' and 'Deposit', 'Money Out' and 'Money In'), use kind=split.",
    "  3. Else (single column with signed numbers) use kind=signed. Pick signConvention by inspecting samples: if outflows are negative numbers use 'outflow_negative'; if outflows are positive use 'outflow_positive'.",
  ].join("\n");
}
