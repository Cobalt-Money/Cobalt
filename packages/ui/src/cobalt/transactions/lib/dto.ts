import type {
  TransactionActivityItem,
  TransactionListItem,
} from "@cobalt-web/server-data/transactions/schemas";
import { toTransactionListItem } from "@cobalt-web/server-data/transactions/to-transaction-list-item";
import type { TransactionRowInput } from "@cobalt-web/server-data/transactions/to-transaction-list-item";
import type { queries, Row } from "@cobalt-web/zero";

/** Zero `useQuery` row for `transactions.activity`. */
export type ZeroTransactionEditRow = Row<typeof queries.transactions.activity>;

export function mapZeroTransactionEditRow(row: ZeroTransactionEditRow): TransactionActivityItem {
  return {
    actor: row.actor as TransactionActivityItem["actor"],
    createdAt:
      typeof row.createdAt === "number"
        ? new Date(row.createdAt).toISOString()
        : String(row.createdAt),
    field: row.field as TransactionActivityItem["field"],
    id: row.id,
    newValue: row.newValue ?? null,
    oldValue: row.oldValue ?? null,
  };
}

/** Zero `useQuery` row for `transactions.list` — full relations baked in by drizzle-zero gen. */
export type ZeroTransactionListRow = Row<typeof queries.transactions.list>;

export function mapZeroTransactionListRow(row: ZeroTransactionListRow): TransactionListItem | null {
  const { account, category: cat, transactionTags, ...txRest } = row;
  if (!account) {
    return null;
  }
  const inst = account.plaidConnection?.institution;

  const flatCategory = cat
    ? {
        groupName: cat.group?.name ?? "",
        groupSystemKey: cat.group?.systemKey ?? null,
        iconKey: cat.iconKey,
        id: cat.id,
        name: cat.name,
        systemKey: cat.systemKey,
      }
    : null;

  const tagIds = transactionTags ? transactionTags.map((t) => t.tagId) : [];

  return toTransactionListItem({
    account: {
      logoDomain: account.logoDomain ?? null,
      name: account.name,
      plaidAccountId: account.externalId ?? "",
      subtype: account.subtype ?? null,
      type: account.type,
    },
    institution: inst
      ? {
          logo: inst.logo ?? null,
          name: inst.name ?? null,
          url: inst.url ?? null,
        }
      : null,
    transaction: {
      ...txRest,
      category: flatCategory,
      tagIds,
    } as unknown as TransactionRowInput,
  });
}
