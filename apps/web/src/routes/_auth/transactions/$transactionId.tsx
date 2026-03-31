import { createFileRoute } from "@tanstack/react-router";

import { TransactionDetailPage } from "@/components/transactions/detail/transaction-detail-page";

export const Route = createFileRoute("/_auth/transactions/$transactionId")({
  component: TransactionDetailRoute,
  staticData: { title: "Transaction" },
});

function TransactionDetailRoute() {
  return <TransactionDetailPage />;
}
