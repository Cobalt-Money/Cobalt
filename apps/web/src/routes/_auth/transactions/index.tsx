import { TransactionsTable } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import { createFileRoute } from "@tanstack/react-router";

import { useTransactions } from "@/hooks/use-transactions";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsListPage,
  staticData: { title: "Transactions" },
});

function TransactionsListPage() {
  const { isComplete, items } = useTransactions();
  return <TransactionsTable isComplete={isComplete} items={items} />;
}
