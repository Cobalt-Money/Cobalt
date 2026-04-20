import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { mapZeroTransactionListRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

interface Filters {
  amount?: "all" | "income" | "expense";
  amountMin?: number;
  amountMax?: number;
  status?: "all" | "pending" | "posted";
  bank?: readonly string[];
}

export function useTransactions(filters: Filters = {}) {
  const [rows, result] = useQuery(
    queries.transactions.list({
      amount: filters.amount ?? "all",
      amountMax: filters.amountMax,
      amountMin: filters.amountMin,
      bank: filters.bank ? [...filters.bank] : [],
      status: filters.status ?? "all",
    })
  );

  const items = useMemo(
    () =>
      rows
        .map((row) => mapZeroTransactionListRow(row))
        .filter((item): item is TransactionListItem => item !== null),
    [rows]
  );

  return {
    isComplete: result.type === "complete",
    items,
  };
}
