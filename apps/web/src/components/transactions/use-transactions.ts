import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

import { mapZeroTransactionListRow } from "./lib/dto";

export function useTransactions() {
  const [rows, result] = useQuery(queries.transactions.list());

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
