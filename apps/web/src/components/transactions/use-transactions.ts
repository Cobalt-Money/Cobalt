import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useMemo } from "react";

import { useOnReady } from "@/lib/providers/zero-client";

import { mapZeroTransactionListRow } from "./lib/dto";

export function useTransactions() {
  const [rows, result] = useQuery(queries.transactions.list());
  const onReady = useOnReady();

  const items = useMemo(
    () =>
      rows
        .map((row) => mapZeroTransactionListRow(row))
        .filter((item): item is TransactionListItem => item !== null),
    [rows]
  );

  useEffect(() => {
    if (items.length > 0 || result.type === "complete") {
      onReady();
    }
  }, [items.length, onReady, result.type]);

  return {
    isComplete: result.type === "complete",
    items,
  };
}
