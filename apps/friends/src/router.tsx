import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/**
 * Router factory. Start calls this on the client (and during prerender) to
 * get a fresh router instance per request. Context is seeded with default
 * anon auth + a per-router QueryClient; the real session snapshot is wired
 * in by the `__root` layout once `authClient.useSession()` resolves.
 */
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60,
      },
    },
  });

  const router = createRouter({
    context: {
      auth: { isPending: true, user: null },
      queryClient,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 10_000,
    routeTree,
    scrollRestoration: true,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
