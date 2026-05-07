/** Raw row shape after papaparse with `header: true` against a Mint export CSV. */
export interface MintRawRow {
  Date: string;
  Description: string;
  "Original Description": string;
  Amount: string;
  "Transaction Type": string;
  Category: string;
  "Account Name": string;
  Labels: string;
  Notes: string;
}

/** Mint export header in the canonical column order. Used for header sniff in `detect()`. */
export const MINT_HEADER_COLUMNS = [
  "Date",
  "Description",
  "Original Description",
  "Amount",
  "Transaction Type",
  "Category",
  "Account Name",
  "Labels",
  "Notes",
] as const;
