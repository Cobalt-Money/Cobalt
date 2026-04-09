import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/news")({
  component: NewsLayout,
});

function NewsLayout() {
  return (
    <SidebarShellLayout>
      <div className="-mb-4 flex min-h-0 h-full min-w-0 flex-1 flex-col lg:-mb-6">
        <Outlet />
      </div>
    </SidebarShellLayout>
  );
}
