import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarShellLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 py-2 sm:gap-5 sm:py-3">
        <Outlet />
      </div>
    </SidebarShellLayout>
  );
}
