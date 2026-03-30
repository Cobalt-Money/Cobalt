import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";

import type { RouterAppContext } from "./__root";

export const Route = createFileRoute("/_auth/transactions")({
  component: TransactionsPage,
  loader: async ({ context }) => {
    const z = (context as RouterAppContext).zero;
    if (z) {
      await z.run(queries.transactions.list());
    }
  },
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
