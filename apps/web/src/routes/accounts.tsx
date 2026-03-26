import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  return (
    <SidebarShellLayout
      description="Placeholder — wire up accounts when ready."
      title="Accounts"
    />
  );
}
