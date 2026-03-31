import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import "./index.css";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createTanStackRouter({
    context: {},
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 10_000,
    routeTree,
    scrollRestoration: true,
  });
  return router;
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
