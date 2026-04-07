import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
  staticData: { title: "Dashboard" },
});

function DashboardPage() {
  return <SidebarShellLayout />;
}
