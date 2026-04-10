import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/research")({
  component: ResearchLayout,
});

function ResearchLayout() {
  return (
    <SidebarShellLayout>
      <Outlet />
    </SidebarShellLayout>
  );
}
