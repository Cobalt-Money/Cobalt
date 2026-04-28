import type {
  TransactionActivityItem,
  TransactionListItem,
} from "@cobalt-web/server-data/transactions/schemas";
import { toTransactionListItem } from "@cobalt-web/server-data/transactions/to-transaction-list-item";
import type { TransactionRowInput } from "@cobalt-web/server-data/transactions/to-transaction-list-item";

/** Zero `useQuery` row for `transactions.activity` — `createdAt` is epoch ms. */
export type ZeroTransactionEditRow = Record<string, unknown> & {
  readonly id: string;
  readonly createdAt: number | string;
};

export function mapZeroTransactionEditRow(
  row: ZeroTransactionEditRow
): TransactionActivityItem {
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

/**
 * Zero `useQuery` rows for `transactions.list` — named-query typings omit `related()` fields;
 * json columns are `unknown` until asserted into {@link TransactionRowInput}.
 */
export type ZeroTransactionListRow = Record<string, unknown> & {
  readonly account?: {
    readonly plaidConnection?: {
      readonly institution?: {
        readonly logo?: string | null;
        readonly name?: string | null;
        readonly url?: string | null;
      };
    } | null;
    readonly name: string;
    readonly externalId: string | null;
    readonly type: string;
  };
};

export function mapZeroTransactionListRow(
  row: ZeroTransactionListRow
): TransactionListItem | null {
  const { account, ...txRest } = row;
  if (!account) {
    return null;
  }
  const inst = account.plaidConnection?.institution;

  return toTransactionListItem({
    account: {
      name: account.name,
      plaidAccountId: account.externalId ?? "",
      type: account.type,
    },
    institution: inst
      ? {
          logo: inst.logo ?? null,
          name: inst.name ?? null,
          url: inst.url ?? null,
        }
      : null,
    transaction: txRest as unknown as TransactionRowInput,
  });
}
