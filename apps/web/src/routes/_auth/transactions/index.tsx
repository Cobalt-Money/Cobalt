import { createFileRoute } from "@tanstack/react-router";

import { TransactionsTable } from "@/components/transactions/transactions-table";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsListPage,
  staticData: { title: "Transactions" },
});

function TransactionsListPage() {
  return <TransactionsTable />;
}
