import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { TransactionsTable } from "@/components/transactions/transactions-table";

export const Route = createFileRoute("/_auth/transactions")({
  component: TransactionsPage,
  staticData: { title: "Transactions" },
});

function TransactionsPage() {
  return (
    <SidebarShellLayout>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TransactionsTable />
      </div>
    </SidebarShellLayout>
  );
}
