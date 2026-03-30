import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

import { mapZeroTransactionListRow } from "./map-zero-transaction-list-row";

export function useTransactionsList() {
  const [rows, queryDetails] = useQuery(queries.transactions.list());

  const items = useMemo(() => {
    const out: TransactionListItem[] = [];
    for (const row of rows) {
      const item = mapZeroTransactionListRow(row);
      if (item) {
        out.push(item);
      }
    }
    return out;
  }, [rows]);

  return { items, queryDetails };
}
