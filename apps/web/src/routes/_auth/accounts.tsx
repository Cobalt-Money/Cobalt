import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { useOnReady } from "@/lib/providers/zero-client";

export const Route = createFileRoute("/_auth/accounts")({
  component: AccountsPage,
  staticData: { title: "Accounts" },
});

function AccountsPage() {
  const onReady = useOnReady();

  useEffect(() => {
    onReady();
  }, [onReady]);

  return <SidebarShellLayout />;
}
