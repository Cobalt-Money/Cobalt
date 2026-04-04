import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/brokerage")({
  component: BrokeragePage,
  staticData: { title: "Brokerage" },
});

function BrokeragePage() {
  return <SidebarShellLayout />;
}
