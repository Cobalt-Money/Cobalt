import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@cobalt-web/ui/globals.css";
import { ZeroProvider } from "./lib/zero-provider";
import { routeTree } from "./routeTree.gen";

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
  context: { auth: { isPending: true, user: null }, queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 10_000,
  routeTree,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Dev-only react-grab overlay — mirrors apps/web/src/routes/__root.tsx.
if (import.meta.env.DEV) {
  void import("react-grab");
}

const rootEl = document.querySelector("#root");
if (!rootEl) {
  throw new Error("#root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ZeroProvider>
        <RouterProvider router={router} />
      </ZeroProvider>
    </QueryClientProvider>
  </StrictMode>,
);
