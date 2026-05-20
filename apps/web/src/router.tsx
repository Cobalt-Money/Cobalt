import type { Zero } from "@rocicorp/zero";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";

import "@cobalt-web/ui/globals.css";
import { routeTree } from "./routeTree.gen";

/**
 * Live auth snapshot exposed to router `beforeLoad` hooks.
 *
 * Following the TanStack Router auth-and-guards pattern: keep React's session
 * source-of-truth in {@link AppSessionProvider}, then mirror it into router
 * context via `router.update` + `router.invalidate` whenever it changes.
 * Routes can then guard synchronously with `context.auth` instead of running
 * an effect/Navigate in render — eliminates the flash of protected content.
 */
export interface AuthSnapshot {
  isPending: boolean;
  user: {
    id: string;
    isAnonymous?: boolean;
    onboardedAt?: Date | string | null;
  } | null;
}

export interface RouterContext {
  queryClient: QueryClient;
  zero: Zero;
  auth: AuthSnapshot;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60,
      },
    },
  });

  return routerWithQueryClient(
    createTanStackRouter({
      context: {
        auth: { isPending: true, user: null },
        queryClient,
        zero: undefined as unknown as Zero,
      },
      defaultNotFoundComponent: () => <div>Not Found</div>,
      defaultPreload: "intent",
      defaultPreloadStaleTime: 10_000,
      routeTree,
      scrollRestoration: true,
    }),
    queryClient,
  );
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }

  interface StaticDataRouteOption {
    /** App shell header title for this route. */
    title?: string;
  }
}
