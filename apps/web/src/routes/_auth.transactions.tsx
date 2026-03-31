import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";

export const Route = createFileRoute("/_auth/transactions")({
  component: TransactionsPage,
  staticData: { title: "Transactions" },
});

function TransactionsPage() {
  return (
    <SidebarShellLayout toolbar={<TransactionsToolbar />}>
      <div className="-mb-4 flex min-h-0 h-full min-w-0 flex-1 flex-col lg:-mb-6">
        <TransactionsTable />
      </div>
    </SidebarShellLayout>
  );
}
