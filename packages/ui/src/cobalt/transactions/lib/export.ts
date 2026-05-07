import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import * as XLSX from "xlsx";

import { getTransactionDisplayDateString, getTransactionDisplayName } from "./helpers";

export type ExportFormat = "csv" | "xlsx";

interface ExportRow {
  Date: string;
  Name: string;
  Merchant: string;
  Amount: number;
  Status: string;
  Bank: string;
  Account: string;
  Category: string;
  Subcategory: string;
}

function toExportRow(item: TransactionListItem): ExportRow {
  const cat = item.category;
  return {
    Account: item.accountName ?? "",
    Amount: item.amount,
    Bank: item.institutionName ?? "",
    Category: cat?.groupName ?? "",
    Date: getTransactionDisplayDateString(item),
    Merchant: item.merchantName?.trim() ?? "",
    Name: getTransactionDisplayName(item),
    Status: item.pending ? "Pending" : "Posted",
    Subcategory: cat?.name ?? "",
  };
}

function buildWorksheet(items: TransactionListItem[]): XLSX.WorkSheet {
  const rows = items.map(toExportRow);
  return XLSX.utils.json_to_sheet(rows);
}

export function buildTransactionsCsv(items: TransactionListItem[]): string {
  return XLSX.utils.sheet_to_csv(buildWorksheet(items));
}

export function buildTransactionsXlsx(items: TransactionListItem[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildWorksheet(items), "Transactions");
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
}

export function buildTransactionsFilename(
  count: number,
  format: ExportFormat,
  now: Date = new Date(),
): string {
  const stamp = now.toISOString().slice(0, 10);
  return `cobalt-transactions-${stamp}-${count}.${format}`;
}

function downloadBlob(content: string | ArrayBuffer, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * TSV string of selected rows (header + data, tab-separated).
 * Pastes cleanly into Excel / Google Sheets / Numbers.
 */
export function buildTransactionsTsv(items: TransactionListItem[]): string {
  return XLSX.utils.sheet_to_csv(buildWorksheet(items), { FS: "\t" });
}

export function exportTransactions(items: TransactionListItem[], format: ExportFormat): void {
  const filename = buildTransactionsFilename(items.length, format);
  if (format === "csv") {
    downloadBlob(buildTransactionsCsv(items), filename, "text/csv;charset=utf-8;");
    return;
  }
  downloadBlob(
    buildTransactionsXlsx(items),
    filename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
