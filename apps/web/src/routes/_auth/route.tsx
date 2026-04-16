import { SidebarProvider } from "@cobalt-web/ui/components/sidebar";
import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";

import { AddAccountProvider } from "@/components/accounts/add-account-provider";
import { AmbientInsetProvider } from "@/components/shell/ambient-inset-context";
import { CommandMenuProvider } from "@/components/shell/command-menu";
import { AppSidebar } from "@/components/shell/sidebar/app-sidebar";
import { useAppSession } from "@/lib/providers/app-session";
import { ZeroProvider } from "@/lib/providers/zero-client";

/**
 * zbugs-style auth: resolve session in the layout (no async `beforeLoad` redirect).
 * Pending UI is handled by {@link ZeroProvider} so Zero bootstrap + session share
 * one shell (no stacked loaders).
 *
 * SidebarProvider + AppSidebar live here (not inside each route layout) so that
 * the sidebar — including the profile avatar — is never unmounted during navigation.
 */
export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const session = useAppSession();

  if (session.isPending) {
    return null;
  }

  if (!session.data) {
    return <Navigate replace to="/" />;
  }

  return (
    <AddAccountProvider>
      <ZeroProvider>
        <CommandMenuProvider>
          <SidebarProvider className="min-h-0 flex-1">
            <AppSidebar />
            <AmbientInsetProvider>
              <Outlet />
            </AmbientInsetProvider>
          </SidebarProvider>
        </CommandMenuProvider>
      </ZeroProvider>
    </AddAccountProvider>
  );
}
