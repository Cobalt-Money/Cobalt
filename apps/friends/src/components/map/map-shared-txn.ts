import { transactionResponseSchema } from "@cobalt-web/server-data/transactions/schemas";
import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import type { queries, Row } from "@cobalt-web/zero";

import { categoryLabel } from "./utils";

type SharedPostRow = Row<typeof queries.social.postByTransactionId>;

const PLACEHOLDER_UUID = "00000000-0000-4000-8000-000000000000";

function normalizeDate(val: string | number | Date | null | undefined): string {
  if (val === null || val === undefined) {
    return "";
  }
  if (typeof val === "number") {
    return new Date(val).toISOString().split("T")[0] ?? "";
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0] ?? "";
  }
  return String(val).split("T")[0] ?? String(val);
}

/** Project a redacted `social_post` row into the txn detail DTO shape. */
export function mapSharedPostToTransaction(row: SharedPostRow): TransactionResponse {
  const categoryKey = row.categorySystemKey ?? "uncategorized";
  const merchant = row.merchantName ?? "Shared transaction";
  const amount =
    row.amountCents === null || row.amountCents === undefined
      ? 0
      : -Math.abs(Number(row.amountCents)) / 100;

  return transactionResponseSchema.parse({
    accountId: PLACEHOLDER_UUID,
    accountLogoDomain: null,
    accountName: row.cardName ?? row.institutionName ?? "Card",
    accountSubtype: null,
    accountType: "credit",
    amount,
    authorizedDate: null,
    category: {
      groupName: "",
      groupSystemKey: null,
      iconKey: categoryKey,
      id: PLACEHOLDER_UUID,
      name: categoryLabel(categoryKey),
      systemKey: categoryKey,
    },
    counterparties: null,
    date: normalizeDate(row.date),
    id: row.transactionId,
    institutionLogo: null,
    institutionName: row.institutionName ?? null,
    institutionUrl: null,
    location: {
      address: null,
      city: null,
      country: null,
      lat: row.lat,
      lon: row.lon,
      postal_code: null,
      region: null,
      store_number: null,
    },
    lockedFields: [],
    logoUrl: row.logoUrl ?? null,
    merchantName: row.merchantName,
    name: merchant,
    notes: row.note ?? null,
    paymentChannel: "in store",
    pending: false,
    plaidAccountId: null,
    source: "plaid",
    tagIds: [],
    website: row.website ?? null,
  });
}
