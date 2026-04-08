import { AccountsToolbar } from "@cobalt-web/ui/cobalt/accounts/accounts-toolbar";
import { AccountsAddAccountFab } from "@cobalt-web/ui/cobalt/accounts/add-account-fab";
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

import {
  AccountsLayoutProvider,
  useAccountsLayout,
} from "./accounts-layout-context";

export const Route = createFileRoute("/_auth/accounts")({
  component: AccountsLayout,
});

function AccountsLayout() {
  return (
    <AccountsLayoutProvider>
      <AccountsLayoutInner />
    </AccountsLayoutProvider>
  );
}

function AccountsLayoutInner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAccountsList = pathname === "/accounts" || pathname === "/accounts/";
  const { activeFilter, setActiveFilter } = useAccountsLayout();

  return (
    <SidebarShellLayout
      toolbar={
        isAccountsList ? (
          <AccountsToolbar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        ) : undefined
      }
    >
      <div className="-mb-4 flex min-h-0 h-full min-w-0 flex-1 flex-col lg:-mb-6">
        <Outlet />
        {isAccountsList ? <AccountsAddAccountFab /> : null}
      </div>
    </SidebarShellLayout>
  );
}
