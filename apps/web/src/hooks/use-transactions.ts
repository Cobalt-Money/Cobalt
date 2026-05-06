import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import {
  mapZeroTransactionEditRow,
  mapZeroTransactionListRow,
} from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import type { ZeroTransactionEditRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

interface Filters {
  amount?: "all" | "income" | "expense";
  amountMin?: number;
  amountMax?: number;
  status?: "all" | "pending" | "posted";
  bank?: readonly string[];
  tagIds?: readonly string[];
  categoryIds?: readonly string[];
}

export function useTransactions(filters: Filters = {}) {
  const [rows, result] = useQuery(
    queries.transactions.list({
      amount: filters.amount ?? "all",
      amountMax: filters.amountMax,
      amountMin: filters.amountMin,
      bank: filters.bank ? [...filters.bank] : [],
      categoryIds: filters.categoryIds ? [...filters.categoryIds] : [],
      status: filters.status ?? "all",
      tagIds: filters.tagIds ? [...filters.tagIds] : [],
    }),
  );

  const items = useMemo(
    () =>
      rows
        .map((row) => mapZeroTransactionListRow(row))
        .filter((item): item is TransactionListItem => item !== null),
    [rows],
  );

  return {
    isComplete: result.type === "complete",
    items,
  };
}

export function useHistory(transactionId: string) {
  const [rows] = useQuery(queries.transactions.activity({ transactionId }));
  return useMemo(() => (rows as ZeroTransactionEditRow[]).map(mapZeroTransactionEditRow), [rows]);
}
