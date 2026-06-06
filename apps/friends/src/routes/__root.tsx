import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "@cobalt-web/ui/components/sonner";

export interface AuthSnapshot {
  isPending: boolean;
  user: { id: string; username?: string | null } | null;
}

export interface RouterContext {
  queryClient: QueryClient;
  auth: AuthSnapshot;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
