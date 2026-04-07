import { TransactionsToolbar } from "@cobalt-web/ui/cobalt/transactions/transactions-toolbar";
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/transactions")({
  component: TransactionsLayout,
});

function TransactionsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTransactionsList =
    pathname === "/transactions" || pathname === "/transactions/";

  return (
    <SidebarShellLayout
      toolbar={isTransactionsList ? <TransactionsToolbar /> : undefined}
    >
      <div className="-mb-4 flex min-h-0 h-full min-w-0 flex-1 flex-col lg:-mb-6">
        <Outlet />
      </div>
    </SidebarShellLayout>
  );
}
