import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/subscriptions")({
  component: SubscriptionsLayout,
});

function SubscriptionsLayout() {
  return (
    <SidebarShellLayout flushBottom>
      <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </SidebarShellLayout>
  );
}
