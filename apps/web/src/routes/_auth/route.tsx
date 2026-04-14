import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";

import { AddAccountProvider } from "@/components/accounts/add-account-provider";
import { CommandMenuProvider } from "@/components/shell/command-menu";
import { useAppSession } from "@/lib/providers/app-session";
import { ZeroProvider } from "@/lib/providers/zero-client";

/**
 * zbugs-style auth: resolve session in the layout (no async `beforeLoad` redirect).
 * Pending UI is handled by {@link ZeroProvider} so Zero bootstrap + session share
 * one shell (no stacked loaders).
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
          <Outlet />
        </CommandMenuProvider>
      </ZeroProvider>
    </AddAccountProvider>
  );
}
