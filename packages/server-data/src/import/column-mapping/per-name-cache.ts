import { db } from "@cobalt-web/db";
import { csvColumnRoleCache } from "@cobalt-web/db/schema/imports/csv-column-role-cache";
import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";
import { inArray, sql } from "drizzle-orm";

/**
 * Per-header column-role cache. Each row records the role the user confirmed
 * for a single CSV header (e.g. "Date" → role=date, "Amount" → role=amount_signed).
 *
 * Lookup assembles a `CsvMapping` from per-header roles whenever every required
 * field (date + amount + merchant) resolves cleanly; misses fall back to the AI
 * agent. Writes happen at confirm time — `cacheRolesFromMapping` decomposes the
 * confirmed mapping into one row per header.
 */

const norm = (h: string) => h.trim().toLowerCase();

export type ColumnRole =
  | "date"
  | "amount_signed"
  | "amount_split_outflow"
  | "amount_split_inflow"
  | "amount_magnitude"
  | "amount_type"
  | "merchant"
  | "account"
  | "category"
  | "notes"
  | "original_description"
  | "tags"
  | "exclude_rule"
  | "transfer_rule_type"
  | "ignore";

interface CachedRow {
  headerName: string;
  meta: Record<string, unknown> | null;
  role: ColumnRole;
}

export async function lookupColumnRoles(
  userId: string,
  headers: string[],
): Promise<Map<string, CachedRow>> {
  if (headers.length === 0) {
    return new Map();
  }
  const normalized = headers.map(norm);
  const rows = await db
    .select()
    .from(csvColumnRoleCache)
    .where(
      sql`${csvColumnRoleCache.userId} = ${userId} AND ${inArray(csvColumnRoleCache.headerName, normalized)}`,
    );
  const map = new Map<string, CachedRow>();
  for (const r of rows) {
    map.set(r.headerName, {
      headerName: r.headerName,
      meta: r.meta,
      role: r.role as ColumnRole,
    });
  }
  return map;
}

/**
 * Try to assemble a `CsvMapping` purely from per-header cache. Returns `null`
 * when any required field (date, amount, merchant) is unresolvable so the caller
 * falls back to the AI agent.
 */
function buildHeaderByRole(
  headers: string[],
  roleByNormalizedHeader: Map<string, CachedRow>,
): Map<ColumnRole, string> {
  const headerByRole = new Map<ColumnRole, string>();
  for (const h of headers) {
    const r = roleByNormalizedHeader.get(norm(h))?.role;
    if (r && !headerByRole.has(r)) {
      headerByRole.set(r, h);
    }
  }
  return headerByRole;
}

function reconstructAmount(
  headerByRole: Map<ColumnRole, string>,
  metaOf: (n: string) => Record<string, unknown> | null | undefined,
): CsvMapping["amount"] | null {
  const signedHeader = headerByRole.get("amount_signed");
  if (signedHeader) {
    const sm = metaOf(norm(signedHeader));
    return {
      column: signedHeader,
      kind: "signed",
      parensNegative: Boolean(sm?.parensNegative),
      signConvention:
        (sm?.signConvention as "outflow_negative" | "outflow_positive") ?? "outflow_negative",
    };
  }
  const magHeader = headerByRole.get("amount_magnitude");
  const typeHeader = headerByRole.get("amount_type");
  if (magHeader && typeHeader) {
    const tm = metaOf(norm(typeHeader));
    return {
      debitValues: Array.isArray(tm?.debitValues) ? (tm.debitValues as string[]) : [],
      kind: "magnitude_type",
      magnitudeColumn: magHeader,
      typeColumn: typeHeader,
    };
  }
  const outflowHeader = headerByRole.get("amount_split_outflow");
  const inflowHeader = headerByRole.get("amount_split_inflow");
  if (outflowHeader && inflowHeader) {
    return {
      inflowColumn: inflowHeader,
      kind: "split",
      outflowColumn: outflowHeader,
    };
  }
  return null;
}

function optionalColumn(
  headerByRole: Map<ColumnRole, string>,
  role: ColumnRole,
): { column: string } | null {
  const h = headerByRole.get(role);
  return h ? { column: h } : null;
}

function reconstructTags(
  headerByRole: Map<ColumnRole, string>,
  metaOf: (n: string) => Record<string, unknown> | null | undefined,
): CsvMapping["tags"] {
  const tagsHeader = headerByRole.get("tags");
  if (!tagsHeader) {
    return null;
  }
  const tagsMeta = metaOf(norm(tagsHeader));
  if (typeof tagsMeta?.delimiter !== "string") {
    return null;
  }
  return { column: tagsHeader, delimiter: tagsMeta.delimiter as string };
}

function reconstructExcludeRule(
  headerByRole: Map<ColumnRole, string>,
  metaOf: (n: string) => Record<string, unknown> | null | undefined,
): CsvMapping["excludeRule"] {
  const excludeHeader = headerByRole.get("exclude_rule");
  if (!excludeHeader) {
    return null;
  }
  const excludeMeta = metaOf(norm(excludeHeader));
  if (!Array.isArray(excludeMeta?.trueValues)) {
    return null;
  }
  return {
    column: excludeHeader,
    trueValues: excludeMeta.trueValues as string[],
  };
}

function reconstructTransferRule(
  headerByRole: Map<ColumnRole, string>,
  metaOf: (n: string) => Record<string, unknown> | null | undefined,
): CsvMapping["transferRule"] {
  const transferTypeHeader = headerByRole.get("transfer_rule_type");
  if (!transferTypeHeader) {
    return null;
  }
  const transferMeta = metaOf(norm(transferTypeHeader));
  if (!Array.isArray(transferMeta?.values)) {
    return null;
  }
  return {
    column: transferTypeHeader,
    kind: "type_match",
    values: transferMeta.values as string[],
  };
}

export function reconstructMapping(
  headers: string[],
  roleByNormalizedHeader: Map<string, CachedRow>,
): CsvMapping | null {
  const metaOf = (n: string) => roleByNormalizedHeader.get(n)?.meta;
  const headerByRole = buildHeaderByRole(headers, roleByNormalizedHeader);

  const dateHeader = headerByRole.get("date");
  const dateMeta = dateHeader ? metaOf(norm(dateHeader)) : undefined;
  const dateFormat = typeof dateMeta?.format === "string" ? (dateMeta.format as string) : undefined;
  if (!dateHeader || !dateFormat) {
    return null;
  }

  const merchantHeader = headerByRole.get("merchant");
  if (!merchantHeader) {
    return null;
  }

  const amount = reconstructAmount(headerByRole, metaOf);
  if (!amount) {
    return null;
  }

  return {
    account: optionalColumn(headerByRole, "account"),
    amount,
    category: optionalColumn(headerByRole, "category"),
    confidence: 1,
    date: { column: dateHeader, format: dateFormat, kind: "column" },
    excludeRule: reconstructExcludeRule(headerByRole, metaOf),
    merchant: { column: merchantHeader },
    notes: optionalColumn(headerByRole, "notes"),
    originalDescription: optionalColumn(headerByRole, "original_description"),
    tags: reconstructTags(headerByRole, metaOf),
    transferRule: reconstructTransferRule(headerByRole, metaOf),
  };
}

/** Decompose a confirmed `CsvMapping` into one (header, role, meta) row per header. */
export async function cacheRolesFromMapping(
  userId: string,
  headers: string[],
  mapping: CsvMapping,
): Promise<void> {
  const rows: {
    headerName: string;
    meta: Record<string, unknown> | null;
    role: ColumnRole;
  }[] = [];
  const seen = new Set<string>();

  const addRow = (headerName: string, role: ColumnRole, meta: Record<string, unknown> | null) => {
    const key = norm(headerName);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    rows.push({ headerName: key, meta, role });
  };

  if (mapping.date.kind === "column") {
    addRow(mapping.date.column, "date", { format: mapping.date.format });
  }
  if (mapping.amount.kind === "signed") {
    addRow(mapping.amount.column, "amount_signed", {
      parensNegative: mapping.amount.parensNegative,
      signConvention: mapping.amount.signConvention,
    });
  } else if (mapping.amount.kind === "magnitude_type") {
    addRow(mapping.amount.magnitudeColumn, "amount_magnitude", {
      typeHeaderName: norm(mapping.amount.typeColumn),
    });
    addRow(mapping.amount.typeColumn, "amount_type", {
      debitValues: mapping.amount.debitValues,
      magnitudeHeaderName: norm(mapping.amount.magnitudeColumn),
    });
  } else {
    // split
    addRow(mapping.amount.outflowColumn, "amount_split_outflow", null);
    addRow(mapping.amount.inflowColumn, "amount_split_inflow", null);
  }
  addRow(mapping.merchant.column, "merchant", null);
  if (mapping.account) {
    addRow(mapping.account.column, "account", null);
  }
  if (mapping.category) {
    addRow(mapping.category.column, "category", null);
  }
  if (mapping.notes) {
    addRow(mapping.notes.column, "notes", null);
  }
  if (mapping.originalDescription) {
    addRow(mapping.originalDescription.column, "original_description", null);
  }
  if (mapping.tags) {
    addRow(mapping.tags.column, "tags", { delimiter: mapping.tags.delimiter });
  }
  if (mapping.excludeRule) {
    addRow(mapping.excludeRule.column, "exclude_rule", {
      trueValues: mapping.excludeRule.trueValues,
    });
  }
  if (mapping.transferRule?.kind === "type_match") {
    addRow(mapping.transferRule.column, "transfer_rule_type", {
      values: mapping.transferRule.values,
    });
  }
  // Headers present in the CSV but not used by the mapping → role=ignore.
  for (const h of headers) {
    const key = norm(h);
    if (!seen.has(key)) {
      addRow(h, "ignore", null);
    }
  }

  if (rows.length === 0) {
    return;
  }
  await db
    .insert(csvColumnRoleCache)
    .values(rows.map((r) => ({ ...r, userId })))
    .onConflictDoUpdate({
      set: {
        confirmedAt: new Date(),
        meta: sql`excluded.meta`,
        role: sql`excluded.role`,
      },
      target: [csvColumnRoleCache.userId, csvColumnRoleCache.headerName],
    });
  console.log(
    `[import.columnRoleCache] write user=${userId} rows=${rows.length} roles=${rows.map((r) => `${r.headerName}:${r.role}`).join(",")}`,
  );
}
