import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/accounts")({
  component: AccountsPage,
  staticData: { title: "Accounts" },
});

function AccountsPage() {
  return <SidebarShellLayout />;
}
