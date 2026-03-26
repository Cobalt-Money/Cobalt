import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <SidebarShellLayout
      description="Placeholder — wire up transactions when ready."
      title="Transactions"
    />
  );
}
