import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { TransactionsTable } from "@/components/transactions/transactions-table";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
  staticData: { title: "Transactions" },
});

function TransactionsPage() {
  return (
    <SidebarShellLayout>
      <div className="min-w-0 w-full">
        <TransactionsTable />
      </div>
    </SidebarShellLayout>
  );
}
