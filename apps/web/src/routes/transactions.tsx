import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
  staticData: { title: "Transactions" },
});

function TransactionsPage() {
  return <SidebarShellLayout />;
}
