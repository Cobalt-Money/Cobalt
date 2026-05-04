import type { Zero } from "@rocicorp/zero";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";

import "@cobalt-web/ui/globals.css";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  queryClient: QueryClient;
  zero: Zero;
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
      context: { queryClient, zero: undefined as unknown as Zero },
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
