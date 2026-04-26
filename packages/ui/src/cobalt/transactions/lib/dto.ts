import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { toTransactionListItem } from "@cobalt-web/server-data/transactions/to-transaction-list-item";
import type { TransactionRowInput } from "@cobalt-web/server-data/transactions/to-transaction-list-item";

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
