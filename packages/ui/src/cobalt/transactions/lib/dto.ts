import { transactionResponseSchema } from "@cobalt-web/server-data/transactions/schemas";
import type {
  TransactionActivityItem,
  TransactionResponse,
} from "@cobalt-web/server-data/transactions/schemas";
import type { queries, Row, TransactionEdit } from "@cobalt-web/zero";

/** Zero `useQuery` row for `transactions.activity`. */
export type ZeroTransactionEditRow = Row<typeof queries.transactions.activity>;

function normalizeEditCreatedAt(value: TransactionEdit["createdAt"]): string {
  if (value === null || value === undefined) {
    return new Date(0).toISOString();
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  return String(value);
}

export function mapZeroTransactionEditRow(row: TransactionEdit): TransactionActivityItem {
  return {
    actor: row.actor as TransactionActivityItem["actor"],
    createdAt: normalizeEditCreatedAt(row.createdAt),
    field: row.field as TransactionActivityItem["field"],
    id: row.id,
    newValue: row.newValue ?? null,
    oldValue: row.oldValue ?? null,
  };
}

/** Zero `useQuery` row for `transactions.list` — full relations baked in by drizzle-zero gen. */
export type ZeroTransactionListRow = Row<typeof queries.transactions.list>;

type ZeroAccount = NonNullable<ZeroTransactionListRow["account"]>;
type ZeroCategory = NonNullable<ZeroTransactionListRow["category"]>;
type ZeroTx = Omit<ZeroTransactionListRow, "account" | "category" | "transactionTags">;

function institutionFields(account: ZeroAccount): {
  institutionLogo: string | null;
  institutionName: string | null;
  institutionUrl: string | null;
} {
  const plaidInst = account.plaidConnection?.institution;
  if (plaidInst) {
    return {
      institutionLogo: plaidInst.logo ?? null,
      institutionName: plaidInst.name ?? null,
      institutionUrl: plaidInst.url ?? null,
    };
  }
  return {
    institutionLogo: null,
    institutionName: account.institutionName ?? account.customName ?? account.name,
    institutionUrl: account.logoDomain ?? null,
  };
}

function flattenCategory(cat: ZeroCategory | null | undefined): TransactionResponse["category"] {
  if (!cat) {
    return null;
  }
  return {
    groupName: cat.group?.name ?? "",
    groupSystemKey: cat.group?.systemKey ?? null,
    iconKey: cat.iconKey,
    id: cat.id,
    name: cat.name,
    systemKey: cat.systemKey,
  };
}

function flattenLocation(tx: ZeroTx): TransactionResponse["location"] {
  const hasAny =
    tx.address ||
    tx.city ||
    tx.region ||
    tx.postalCode ||
    tx.country ||
    tx.storeNumber ||
    tx.lat !== null ||
    tx.lon !== null;
  if (!hasAny) {
    return null;
  }
  return {
    address: tx.address ?? null,
    city: tx.city ?? null,
    country: tx.country ?? null,
    lat: tx.lat ?? null,
    lon: tx.lon ?? null,
    postal_code: tx.postalCode ?? null,
    region: tx.region ?? null,
    store_number: tx.storeNumber ?? null,
  };
}

function normalizeDate(val: string | number | Date | null | undefined): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === "number") {
    return new Date(val).toISOString().split("T")[0] ?? null;
  }
  return String(val);
}

/**
 * Adapt Zero's nested row shape to the public DTO. Server query already returns
 * the DTO shape directly; Zero needs a flatten step. Schema parse enforces output drift.
 */
export function mapZeroTransactionListRow(row: ZeroTransactionListRow): TransactionResponse | null {
  const { account, category: cat, transactionTags, ...tx } = row;
  if (!account) {
    return null;
  }
  return transactionResponseSchema.parse({
    accountId: account.id,
    accountLogoDomain: account.logoDomain ?? null,
    accountName: account.name,
    accountSubtype: account.subtype ?? null,
    accountType: account.type,
    amount: Number(tx.amount),
    authorizedDate: normalizeDate(tx.authorizedDate),
    category: flattenCategory(cat),
    counterparties: tx.counterparties ?? null,
    date: normalizeDate(tx.date) ?? "",
    id: tx.id,
    ...institutionFields(account),
    location: flattenLocation(tx),
    lockedFields: tx.lockedFields ?? [],
    logoUrl: tx.logoUrl ?? null,
    merchantName: tx.merchantName ?? null,
    name: tx.name,
    notes: tx.notes ?? null,
    pending: tx.pending ?? false,
    plaidAccountId: account.externalId ?? null,
    source: tx.source,
    tagIds: transactionTags ? transactionTags.map((t) => t.tagId) : [],
    website: tx.website ?? null,
  });
}

/** Zero `useQuery` row for `transactions.detail` — same as list + `edits`. */
export type ZeroTransactionDetailRow = NonNullable<Row<typeof queries.transactions.detail>>;

/** Detail-row variant: same flatten as the list row, plus mapped edits. */
export function mapZeroTransactionDetailRow(row: ZeroTransactionDetailRow): {
  transaction: TransactionResponse;
  events: TransactionActivityItem[];
} | null {
  const mapped = mapZeroTransactionListRow(row as unknown as ZeroTransactionListRow);
  if (!mapped) {
    return null;
  }
  const edits = (row as unknown as { edits?: readonly TransactionEdit[] }).edits ?? [];
  return {
    events: edits.map(mapZeroTransactionEditRow),
    transaction: mapped,
  };
}
