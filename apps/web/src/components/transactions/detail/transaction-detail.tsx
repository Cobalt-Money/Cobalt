import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Separator } from "@cobalt-web/ui/components/separator";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { useTransactions } from "../use-transactions";
import { TransactionDetailActivity } from "./transaction-detail-activity";
import { TransactionDetailSummary } from "./transaction-detail-summary";

const transactionDetailRouteApi = getRouteApi(
  "/_auth/transactions/$transactionId"
);

export function TransactionDetailPage() {
  const { transactionId } = transactionDetailRouteApi.useParams();
  const navigate = useNavigate();
  const { isComplete, items } = useTransactions();

  const transaction = useMemo(
    () => items.find((t) => t.id === transactionId),
    [items, transactionId]
  );

  useEffect(() => {
    if (isComplete && !transaction) {
      navigate({ replace: true, to: "/transactions" });
    }
  }, [isComplete, navigate, transaction]);

  if (!transaction) {
    return (
      <div className="mx-auto flex min-h-48 w-full max-w-2xl items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <TransactionDetailContent transaction={transaction} />;
}

function TransactionDetailContent({
  transaction,
}: {
  transaction: TransactionListItem;
}) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8 pt-[10vh] pb-8">
      <TransactionDetailSummary transaction={transaction} />
      <Separator />
      <TransactionDetailActivity transaction={transaction} />
    </div>
  );
}
