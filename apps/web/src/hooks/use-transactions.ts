import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import {
  mapZeroTransactionEditRow,
  mapZeroTransactionListRow,
} from "@cobalt-web/ui/cobalt/transactions/lib/dto";
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
  query?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Picks between the no-arg and parameterized `transactions.list` query based
 * on whether the caller has actual filters. Centralized so the loader prefetch
 * and the hook both produce the same query hash — otherwise we end up with
 * multiple parallel subscriptions for the same 582-row dataset.
 */
export function transactionsListQuery(filters: Filters) {
  const hasFilters =
    (filters.amount && filters.amount !== "all") ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined ||
    (filters.status && filters.status !== "all") ||
    (filters.bank && filters.bank.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.categoryIds && filters.categoryIds.length > 0);

  if (!hasFilters) {
    return queries.transactions.list();
  }
  return queries.transactions.list({
    amount: filters.amount ?? "all",
    amountMax: filters.amountMax,
    amountMin: filters.amountMin,
    bank: filters.bank ? [...filters.bank] : [],
    categoryIds: filters.categoryIds ? [...filters.categoryIds] : [],
    status: filters.status ?? "all",
    tagIds: filters.tagIds ? [...filters.tagIds] : [],
  });
}

export function useTransactions(filters: Filters = {}) {
  const [rows, result] = useQuery(transactionsListQuery(filters));

  const items = useMemo(() => {
    const mapped = rows
      .map((row) => mapZeroTransactionListRow(row))
      .filter((item): item is TransactionListItem => item !== null);
    const q = filters.query?.trim().toLowerCase();
    const from = filters.dateFrom;
    const to = filters.dateTo;
    if (!q && !from && !to) {
      return mapped;
    }
    return mapped.filter((item) => {
      if (q) {
        const name = (item.name ?? "").toLowerCase();
        const merchant = (item.merchantName ?? "").toLowerCase();
        if (!name.includes(q) && !merchant.includes(q)) {
          return false;
        }
      }
      if (from && item.date < from) {
        return false;
      }
      if (to && item.date > to) {
        return false;
      }
      return true;
    });
  }, [rows, filters.query, filters.dateFrom, filters.dateTo]);

  return {
    isComplete: result.type === "complete",
    items,
  };
}

export function useHistory(transactionId: string) {
  const [rows] = useQuery(queries.transactions.activity({ transactionId }));
  return useMemo(() => rows.map(mapZeroTransactionEditRow), [rows]);
}
